import descriptors from '../../asset/descriptors.json!';
import makeAnimations from './make-animations';
import parameters from '../project/parameters';
import uniforms from './uniforms';
import { OBJLoader } from '../libs/OBJLoader';
import { PLYLoader } from '../libs/PLYLoader';
import io from 'socket.io-client/dist/socket.io';
import * as THREE from 'three.js';

const baseUrl = 'asset/';

const urlCallbacks = {};
function register(urls, callback) {
	urls.forEach(url => {
		urlCallbacks[url] = callback;
	});
}

const files = {};

const assets = {
	animations: null,
	geometries: {},
	fonts: {},
	textures: {},
	shaders: {},
	load,
};

function load(callback) {
	register([descriptors.animations], () => {
		assets.animations = makeAnimations(JSON.parse(files[descriptors.animations]));
	});

	const loader = new THREE.FileLoader();

	loader.load(baseUrl + 'shader/header.glsl', shaderHeader => {
		shaderHeader += 'uniform float ' + Object.keys(parameters).join(', ') + ';';

		const plyLoader = new PLYLoader();
		const objLoader = new OBJLoader();
		const textureLoader = new THREE.TextureLoader();

		Object.keys(descriptors.geometries).forEach(name => {
			const url = descriptors.geometries[name].file;

			const infos = url.split('.');
			const extension = infos[infos.length - 1];
			switch (extension) {
			case 'obj':
				register([url], () => {
					assets.geometries[name] = objLoader.parse(files[url]);
				});
				break;
			case 'ply':
				register([url], () => {
					assets.geometries[name] = plyLoader.parse(files[url]);
				});
				break;
			default:
				console.error('Unknown extension', extension);
				break;
			}
		});

		const fontLoader = new THREE.FontLoader();

		Object.keys(descriptors.fonts).forEach(name => {
			const url = descriptors.fonts[name].file;

			register([url], () => {
				assets.fonts[name] = fontLoader.parse(files[url]);
			});
		});

		Object.keys(descriptors.shaders).forEach(name => {
			const vertexShaderUrl = descriptors.shaders[name].vertexShader;
			const fragmentShaderUrl = descriptors.shaders[name].fragmentShader;
			register([vertexShaderUrl, fragmentShaderUrl], () => {
				if (assets.shaders[name] === undefined) {
					assets.shaders[name] = new THREE.ShaderMaterial(Object.assign({}, descriptors.shaders[name], {
						vertexShader: shaderHeader + files[vertexShaderUrl],
						fragmentShader: shaderHeader + files[fragmentShaderUrl],
						uniforms: uniforms,
					}));
				} else {
					assets.shaders[name].vertexShader = shaderHeader + files[vertexShaderUrl];
					assets.shaders[name].fragmentShader = shaderHeader + files[fragmentShaderUrl];
					assets.shaders[name].needsUpdate = true;
				}
			});
		});

		const urls = Object.keys(urlCallbacks);

		function parse() {
			urls.forEach(url => urlCallbacks[url]());
			return callback();
		}
		const textureNames = Object.keys(descriptors.textures);
		let pending = textureNames.length;
		if (!pending)
			return loadOtherAssets();
		else
			textureNames.forEach(name => {
				const textureUrl = descriptors.textures[name].file;

				textureLoader.load(baseUrl + textureUrl, (texture) => {
					assets.textures[name] = texture;

					--pending;
					if (!pending)
						return loadOtherAssets();
				});
			});

		function loadOtherAssets() {
			let pending = urls.length;
			urls.forEach(url => {
				loader.load(baseUrl + url, data => {
					files[url] = data;

					--pending;
					if (!pending)
						return parse();
				});
			});
		}

		let socket;

		function connect() {
			socket = io('http://localhost:5776');
			socket.on('change', change);
			socket.on('disconnect', connect);
		}

		function change(data) {
			if (data.path.lastIndexOf(baseUrl, 0) === 0) {
				const url = data.path.substr(baseUrl.length);
				const callback = urlCallbacks[url];
				if (callback) {
					console.log('Reloading asset', url);
					return loader.load(baseUrl + url, data => {
						files[url] = data;
						return callback();
					});
				}
			}
		}

		connect();
	});
}

export default assets;
