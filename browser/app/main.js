import './style.css!';

import * as THREE from 'three.js';
import './utils/utils';
import { Particle } from './engine/particle';
import { Line } from './engine/line';
import { Point } from './engine/point';
import { Text } from './engine/text';
import { assets } from './editor/assets';
import { OrbitControls } from './utils/OrbitControls';
import { materials } from './editor/materials';
import { renderer } from './engine/renderer';
import { makeText } from './utils/makeText';

let camera, scene, controls;
let particle, line, point, text;
let time;

assets.load(function() {
	init();
	window.addEventListener( 'resize', onWindowResize, false );
	animate();
});

function init ()
{
	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 1000 );
	camera.position.y = 10;
	camera.position.z = 20;

	controls = new OrbitControls( camera, renderer.domElement );
	controls.rotateSpeed = 0.5;

	scene = new THREE.Scene();
	materials.setup();
	particle = new Particle(assets.geometries["tree"].children[0].geometry.attributes);
	scene.add( particle.mesh );

	point = new Point(256*256, materials.point);
	scene.add( point.mesh );

	line = new Line(assets.geometries["tree"].children[0].geometry.attributes);
	scene.add( line.mesh );
	
	var textScale = .2;
	text = new Text("coucou");
	console.log(text);
	scene.add (text.mesh);

  time = 0;
}

function animate ()
{
	requestAnimationFrame( animate );

	materials.text.uniforms.time.value += 0.016;
	controls.update();
	particle.update();
	line.update();
	renderer.render( scene, camera );

	time += 0.016;
}

function onWindowResize ()
{
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
	particle.uniforms.resolution.value = new THREE.Vector2(window.innerWidth, window.innerHeight);
	line.uniforms.resolution.value = new THREE.Vector2(window.innerWidth, window.innerHeight);
}
