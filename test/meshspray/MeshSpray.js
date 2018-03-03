/**
 * @author Kai Salmen / www.kaisalmen.de
 */

'use strict';

var MeshSpray = (function () {

	var Validator = THREE.LoaderSupport.Validator;

	function MeshSpray( manager ) {
		this.manager = Validator.verifyInput( manager, THREE.DefaultLoadingManager );
		this.logging = {
			enabled: true,
			debug: false
		};

		this.instanceNo = 0;
		this.loaderRootNode = new THREE.Group();

		this.builder = new THREE.LoaderSupport.Builder();
		this.callbacks = new THREE.LoaderSupport.Callbacks();
		this.workerSupport = null;
	}

	MeshSpray.prototype.setLogging = function ( enabled, debug ) {
		this.logging.enabled = enabled === true;
		this.logging.debug = debug === true;
		this.builder.setLogging( this.logging.enabled, this.logging.debug );
	};

	MeshSpray.prototype.setStreamMeshesTo = function ( streamMeshesTo ) {
		this.loaderRootNode = Validator.verifyInput( streamMeshesTo, this.loaderRootNode );
	};

	MeshSpray.prototype.run = function ( prepData, workerSupportExternal ) {

		if ( THREE.LoaderSupport.Validator.isValid( workerSupportExternal ) ) {

			this.workerSupport = workerSupportExternal;
			this.logging.enabled = this.workerSupport.logging.enabled;
			this.logging.debug = this.workerSupport.logging.debug;

		} else {

			this.workerSupport = THREE.LoaderSupport.Validator.verifyInput( this.workerSupport, new THREE.LoaderSupport.WorkerSupport() );

		}
		if ( this.logging.enabled ) console.time( 'MeshSpray' + this.workerSupport.instanceNo );

		this._applyPrepData( prepData );

		this.builder.init();

		var scope = this;
		var scopeBuilderFunc = function ( payload ) {
			var meshes = scope.builder.processPayload( payload );
			var mesh;
			for ( var i in meshes ) {
				mesh = meshes[ i ];
				scope.loaderRootNode.add( mesh );
			}
		};
		var scopeFuncComplete = function ( message ) {
			var callback = scope.callbacks.onLoad;
			if ( THREE.LoaderSupport.Validator.isValid( callback ) ) callback(
				{
					detail: {
						loaderRootNode: scope.loaderRootNode,
						modelName: scope.modelName,
						instanceNo: scope.instanceNo
					}
				}
			);
			if ( scope.logging.enabled ) console.timeEnd( 'MeshSpray' + scope.workerSupport.instanceNo );
		};

		var buildCode = function ( funcBuildObject, funcBuildSingleton ) {
			var workerCode = '';
			workerCode += '/**\n';
			workerCode += '  * This code was constructed by MeshSpray buildCode.\n';
			workerCode += '  */\n\n';
			workerCode += 'THREE.LoaderSupport = {};\n\n';
			workerCode += funcBuildObject( 'THREE.LoaderSupport.Validator', THREE.LoaderSupport.Validator );
			workerCode += funcBuildSingleton( 'Parser', Parser );

			return workerCode;
		};
		var libs2Load = [ 'node_modules/three/build/three.min.js' ];
		this.workerSupport.validate( buildCode, 'Parser', libs2Load, '../../' );
		this.workerSupport.setCallbacks( scopeBuilderFunc, scopeFuncComplete );
		this.workerSupport.run(
			{
				params: {
					dimension: prepData.dimension,
					quantity: prepData.quantity,
					globalObjectCount: prepData.globalObjectCount
				},
				materials: {
					serializedMaterials: this.builder.getMaterialsJSON()
				},
				logging: {
					enabled: this.logging.enabled,
					debug: this.logging.debug
				},
				data: {
					input: null,
					options: null
				}
			}
		);
	};

	MeshSpray.prototype._applyPrepData = function ( prepData ) {
		if ( Validator.isValid( prepData ) ) {

			this.setLogging( prepData.logging.enabled, prepData.logging.debug );
			this.setStreamMeshesTo( prepData.streamMeshesTo );
			this.builder.setMaterials( prepData.materials );
			this._setCallbacks( prepData.getCallbacks() );

		}
	};

	MeshSpray.prototype._setCallbacks = function ( callbacks ) {
		if ( Validator.isValid( callbacks.onProgress ) ) this.callbacks.setCallbackOnProgress( callbacks.onProgress );
		if ( Validator.isValid( callbacks.onMeshAlter ) ) this.callbacks.setCallbackOnMeshAlter( callbacks.onMeshAlter );
		if ( Validator.isValid( callbacks.onLoad ) ) this.callbacks.setCallbackOnLoad( callbacks.onLoad );
		if ( Validator.isValid( callbacks.onLoadMaterials ) ) this.callbacks.setCallbackOnLoadMaterials( callbacks.onLoadMaterials );

		this.builder._setCallbacks( this.callbacks );
	};



	var Parser  = ( function () {

		function Parser() {
			this.sizeFactor = 0.5;
			this.localOffsetFactor = 1.0;
			this.globalObjectCount = 0;
			this.debug = false;
			this.dimension = 200;
			this.quantity = 1;
			this.callbackBuilder = null;
			this.callbackProgress = null;
			this.serializedMaterials = null;
			this.logging = {
				enabled: true,
				debug: false
			};
		};

		Parser.prototype.setLogging = function ( enabled, debug ) {
			this.logging.enabled = enabled === true;
			this.logging.debug = debug === true;
		};

		Parser.prototype.parse = function () {
			var baseTriangle = [ 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 0.0, -1.0, 1.0 ];
			var vertices = [];
			var colors = [];
			var normals = [];
			var uvs = [];

			var dimensionHalf = this.dimension / 2;
			var fixedOffsetX;
			var fixedOffsetY;
			var fixedOffsetZ;
			var s, t;
			// complete triagle
			var sizeVaring = this.sizeFactor * Math.random();
			// local coords offset
			var localOffsetFactor = this.localOffsetFactor;

			for ( var i = 0; i < this.quantity; i++ ) {
				sizeVaring = this.sizeFactor * Math.random();

				s = 2 * Math.PI * Math.random();
				t = Math.PI * Math.random();

				fixedOffsetX = dimensionHalf * Math.random() * Math.cos( s ) * Math.sin( t );
				fixedOffsetY = dimensionHalf * Math.random() * Math.sin( s ) * Math.sin( t );
				fixedOffsetZ = dimensionHalf * Math.random() * Math.cos( t );
				for ( var j = 0; j < baseTriangle.length; j += 3 ) {
					vertices.push( baseTriangle[ j ] * sizeVaring + localOffsetFactor * Math.random() + fixedOffsetX );
					vertices.push( baseTriangle[ j + 1 ] * sizeVaring + localOffsetFactor * Math.random() + fixedOffsetY );
					vertices.push( baseTriangle[ j + 2 ] * sizeVaring + localOffsetFactor * Math.random() + fixedOffsetZ );
					colors.push( Math.random() );
					colors.push( Math.random() );
					colors.push( Math.random() );
				}
			}

			var absoluteVertexCount = vertices.length;
			var absoluteColorCount = colors.length;
			var absoluteNormalCount = 0;
			var absoluteUvCount = 0;

			var vertexFA = new Float32Array( absoluteVertexCount );
			var colorFA = ( absoluteColorCount > 0 ) ? new Float32Array( absoluteColorCount ) : null;
			var normalFA = ( absoluteNormalCount > 0 ) ? new Float32Array( absoluteNormalCount ) : null;
			var uvFA = ( absoluteUvCount > 0 ) ? new Float32Array( absoluteUvCount ) : null;

			vertexFA.set( vertices, 0 );
			if ( colorFA ) {

				colorFA.set( colors, 0 );

			}

			if ( normalFA ) {

				normalFA.set( normals, 0 );

			}
			if ( uvFA ) {

				uvFA.set( uvs, 0 );

			}

			/*
			 * This demonstrates the usage of embedded three.js in the worker blob and
			 * the serialization of materials back to the Builder outside the worker.
			 *
			 * This is not the most effective way, but outlining possibilities
			 */
			var materialName = 'defaultVertexColorMaterial_double';
			var defaultVertexColorMaterialJson = this.serializedMaterials[ 'defaultVertexColorMaterial' ];
			var loader = new THREE.MaterialLoader();

			var defaultVertexColorMaterialDouble = loader.parse( defaultVertexColorMaterialJson );
			defaultVertexColorMaterialDouble.name = materialName;
			defaultVertexColorMaterialDouble.side = THREE.DoubleSide;

			var newSerializedMaterials = {};
			newSerializedMaterials[ materialName ] = defaultVertexColorMaterialDouble.toJSON();
			var payload = {
				cmd: 'materialData',
				materials: {
					serializedMaterials: newSerializedMaterials
				}
			};
			this.callbackBuilder( payload );

			this.globalObjectCount++;
			this.callbackBuilder(
				{
					cmd: 'meshData',
					progress: {
						numericalValue: 1.0
					},
					params: {
						meshName: 'Gen' + this.globalObjectCount
					},
					materials: {
						multiMaterial: false,
						materialNames: [ materialName ],
						materialGroups: []
					},
					buffers: {
						vertices: vertexFA,
						colors: colorFA,
						normals: normalFA,
						uvs: uvFA
					}
				},
				[ vertexFA.buffer ],
				colorFA !== null ? [ colorFA.buffer ] : null,
				normalFA !== null ? [ normalFA.buffer ] : null,
				uvFA !== null ? [ uvFA.buffer ] : null
			);

			if ( this.logging.enabled ) console.info( 'Global output object count: ' + this.globalObjectCount );
		};

		return Parser;
	})();


	Parser.prototype.setSerializedMaterials = function ( serializedMaterials ) {
		if ( THREE.LoaderSupport.Validator.isValid( serializedMaterials ) ) {

			this.serializedMaterials = serializedMaterials;

		}
	};

	return MeshSpray;

})();

var MeshSprayApp = (function () {

	function MeshSprayApp( elementToBindTo ) {
		this.renderer = null;
		this.canvas = elementToBindTo;
		this.aspectRatio = 1;
		this.recalcAspectRatio();

		this.scene = null;
		this.cameraDefaults = {
			posCamera: new THREE.Vector3( 500.0, 500.0, 1000.0 ),
			posCameraTarget: new THREE.Vector3( 0, 0, 0 ),
			near: 0.1,
			far: 10000,
			fov: 45
		};
		this.camera = null;
		this.cameraTarget = this.cameraDefaults.posCameraTarget;

		this.controls = null;

		this.cube = null;
		this.pivot = null;
	}

	MeshSprayApp.prototype.initGL = function () {
		this.renderer = new THREE.WebGLRenderer( {
			canvas: this.canvas,
			antialias: true,
			autoClear: true
		} );
		this.renderer.setClearColor( 0x050505 );

		this.scene = new THREE.Scene();

		this.camera = new THREE.PerspectiveCamera( this.cameraDefaults.fov, this.aspectRatio, this.cameraDefaults.near, this.cameraDefaults.far );
		this.resetCamera();
		this.controls = new THREE.TrackballControls( this.camera, this.renderer.domElement );

		var ambientLight = new THREE.AmbientLight( 0x404040 );
		var directionalLight1 = new THREE.DirectionalLight( 0xC0C090 );
		var directionalLight2 = new THREE.DirectionalLight( 0xC0C090 );

		directionalLight1.position.set( -100, -50, 100 );
		directionalLight2.position.set( 100, 50, -100 );

		this.scene.add( directionalLight1 );
		this.scene.add( directionalLight2 );
		this.scene.add( ambientLight );

		var helper = new THREE.GridHelper( 1200, 60, 0xFF4444, 0x404040 );
		this.scene.add( helper );

		var geometry = new THREE.BoxGeometry( 10, 10, 10 );
		var material = new THREE.MeshNormalMaterial();
		this.cube = new THREE.Mesh( geometry, material );
		this.cube.position.set( 0, 0, 0 );
		this.scene.add( this.cube );

		this.pivot = new THREE.Object3D();
		this.pivot.name = 'Pivot';
		this.scene.add( this.pivot );
	};

	MeshSprayApp.prototype.initContent = function () {
		var maxQueueSize = 1024;
		var maxWebWorkers = 4;
		var radius = 640;
		var workerDirector = new THREE.LoaderSupport.WorkerDirector( MeshSpray );
		workerDirector.setLogging( false, false );
		workerDirector.setCrossOrigin( 'anonymous' );

		var callbackOnLoad = function ( event ) {
			console.info( 'Worker #' + event.detail.instanceNo + ': Completed loading. (#' + workerDirector.objectsCompleted + ')' );
		};
		var reportProgress = function( event ) {
			document.getElementById( 'feedback' ).innerHTML = event.detail.text;
			console.info( event.detail.text );
		};
		var callbackMeshAlter = function ( event ) {
			var override = new THREE.LoaderSupport.LoadedMeshUserOverride( false, true );

			event.detail.side = THREE.DoubleSide;
			var mesh = new THREE.Mesh( event.detail.bufferGeometry, event.detail.material );
			mesh.name = event.detail.meshName;
			override.addMesh( mesh );

			return override;
		};


		var callbacks = new THREE.LoaderSupport.Callbacks();
		callbacks.setCallbackOnMeshAlter( callbackMeshAlter );
		callbacks.setCallbackOnLoad( callbackOnLoad );
		callbacks.setCallbackOnProgress( reportProgress );
		workerDirector.prepareWorkers( callbacks, maxQueueSize, maxWebWorkers );

		var prepData;
		var pivot;
		var s, t, r, x, y, z;
		var globalObjectCount = 0;
		for ( var i = 0; i < maxQueueSize; i++ ) {
			prepData = new THREE.LoaderSupport.PrepData( 'Triangles_' + i );

			pivot = new THREE.Object3D();
			s = 2 * Math.PI * Math.random();
			t = Math.PI * Math.random();
			r = radius * Math.random();
			x = r * Math.cos( s ) * Math.sin( t );
			y = r * Math.sin( s ) * Math.sin( t );
			z = r * Math.cos( t );
			pivot.position.set( x, y, z );
			this.scene.add( pivot );
			prepData.setStreamMeshesTo( pivot );

			prepData.quantity = 8192;
			prepData.dimension = Math.max( Math.random() * 500, 100 );
			prepData.globalObjectCount = globalObjectCount++;

			workerDirector.enqueueForRun( prepData );
		}
		workerDirector.processQueue();
	};

	MeshSprayApp.prototype.resizeDisplayGL = function () {
		this.controls.handleResize();

		this.recalcAspectRatio();
		this.renderer.setSize( this.canvas.offsetWidth, this.canvas.offsetHeight, false );

		this.updateCamera();
	};

	MeshSprayApp.prototype.recalcAspectRatio = function () {
		this.aspectRatio = ( this.canvas.offsetHeight === 0 ) ? 1 : this.canvas.offsetWidth / this.canvas.offsetHeight;
	};

	MeshSprayApp.prototype.resetCamera = function () {
		this.camera.position.copy( this.cameraDefaults.posCamera );
		this.cameraTarget.copy( this.cameraDefaults.posCameraTarget );

		this.updateCamera();
	};

	MeshSprayApp.prototype.updateCamera = function () {
		this.camera.aspect = this.aspectRatio;
		this.camera.lookAt( this.cameraTarget );
		this.camera.updateProjectionMatrix();
	};

	MeshSprayApp.prototype.render = function () {
		if ( ! this.renderer.autoClear ) this.renderer.clear();

		this.controls.update();

		this.cube.rotation.x += 0.05;
		this.cube.rotation.y += 0.05;

		this.renderer.render( this.scene, this.camera );
	};

	return MeshSprayApp;

})();
