var canvas;
var gl;
//
var centroid,centroid2;
var outer_space_color = vec4(0.8, 0.8, 0.8, 1.0);

var reflection_sphr;
var transparency_sphr;
var surface_color_sphr;
//
var numTimesToSubdivide = 3;

var index = 0;

var pointsArray = [];
var normalsArray = [];

var near = -10;
var far = 10;
var radius = 2.5;
var theta = 0.0;
var phi = 0.0;
var dr = (5.0 * Math.PI) / 180.0;

var left = -3.0;
var right = 3.0;
var ytop = 3.0;
var bottom = -3.0;

var va = vec4(0.0, 0.0, -1.0, 1);
var vb = vec4(0.0, 0.942809, 0.333333, 1);
var vc = vec4(-0.816497, -0.471405, 0.333333, 1);
var vd = vec4(0.816497, -0.471405, 0.333333, 1);

var lightPosition = vec4(1.0, 1.0, 1.0, 0.0);
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

var materialAmbient = vec4(1.0, 0.0, 1.0, 1.0);
var materialDiffuse = vec4(1.0, 0.8, 0.0, 1.0);
var materialSpecular = vec4(1.0, 1.0, 1.0, 1.0);
var materialShininess = 20.0;

var ctm;
var ambientColor, diffuseColor, specularColor;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;
var camPositionLoc;

var normalMatrix, normalMatrixLoc;

var cameraPosition;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

SPHERE_QUALITY = 5;

var imageSize = 128;

// Create image data
// Here i used Uint8ClampedArray instead of Uint8Array so that it is clamped.
// * 3 is for dimension
var image = new Uint8ClampedArray(imageSize * imageSize * 3);

// Texture coords for quad
var canvas;
var gl;

var program;

var texture;


// Ray tracing function - top lvl fnc
function raytrace(depth)
{
  //console.log(depth);
  for (var y = 0; y < imageSize; ++y)
  {
    for (var x = 0; x < imageSize; ++x)
    {
      //console.log(imageSize);
      pxl_x = ( x / imageSize - 0.5)*2;
      pxl_y = ( y / imageSize - 0.5)*2;
      pxl = vec3( pxl_x, pxl_y, 1.0);
      dir = normalize( pxl, false);


      // Get color
      var color = trace( pxl, dir, depth);

      // Set color values
      image[(y * imageSize + x) * 3 + 0] = 255 * color[0];
      image[(y * imageSize + x) * 3 + 1] = 255 * color[1];
      image[(y * imageSize + x) * 3 + 2] = 255 * color[2];
    }
  }
}

// fire a ray, return RGB
function trace( ray_orig, ray_dir, depth) 
{
  if (depth == 0) {
    console.log("depth is 0");
    return;
  }

  let object_point = closest_ray_surface_intersection( ray_orig, ray_dir);

  if (object_point) {
    console.log("shading used");
    return shade( object_point, ray_orig, ray_dir, depth);
  }
  // no intersection, use background color
  else {
    console.log("background color used");
    return outer_space_color; 
  }
}

// return color emitted by surface in ray intersection
function shade( point, ray_orig, ray_dir, depth)
{
  var surface_color;
  var reflection;
  var refraction;
  var intersection_pt = vec3(add(ray_orig, ray_dir.map(x => x * point))); // intersection point
  var intersection_n = vec3(subtract(intersection_pt, centroid)); // normal at intersection poit
  intersection_n = normalize(intersection_n, false); 

  // check if we are inside the object, view rays and normal should be opposite
  var isInside = false;
  if( dot(ray_dir,intersection_n) > 0.0) {
    intersection_n = intersection_n.map(x => x * (-1))// -1*intersection_n;
    isInside = true;
  }
  //TODO: should make this work object specific at some point 
  if(reflection_sphr > 0) {
    // calculate REFLECTION direction & normalize
    var m = (2* dot( ray_dir, intersection_n));
    var reflection_dir = vec3(subtract(ray_dir, intersection_n.map(x => x * m)));
    reflection_dir = normalize( reflection_dir, false);

    // trace the reflection ray
    reflection = trace( add(intersection_pt,intersection_n), reflection_dir, depth-1); 
    if(transparency_sphr > 0)
    {
      // calculate REFRACTION for transparent objects
      var refraction_dir;
      //TODO
    }

    //TODO
    surface_color = reflection; 
    //surfaceColor = ( 
    //  reflection * fresneleffect + 
    //  refraction * (1 - fresneleffect) * sphere->transparency) * sphere->surfaceColor; 
  }
  // obj is OPAQUE, don't raytrace anymore.
  else{
    var light_dir = vec3(subtract(centroid, intersection_pt));
    light_dir = normalize(light_dir, false);

    // intersect w/ light vector
    // loop this for multiple objects
    if( closest_ray_surface_intersection( centroid, light_dir)){
      transmission = 0;
    }
    
    //TODO
    //surfaceColor += sphere->surfaceColor * transmission * 
    //            std::max(float(0), nhit.dot(lightDirection)) * spheres[i].emissionColor; 
            
  }

  //TODO
  return surface_color;
}

function closest_ray_surface_intersection( ray_orig, ray_dir)
{
  // find every point of intersection of each object with the ray. 
  // Return the closest intersection in a bundle that contains info such as surface normal, pointer to surface color info, etc.
  
  return sphere_intersection(centroid, radius, ray_orig, ray_dir);
}

function sphere_intersection(sphere_center, sphere_r, ray_orig, ray_dir)
{
  ray = vec3(subtract(sphere_center,ray_orig));

  // formulate discriminant formula
  let a = dot(ray_dir, ray_dir);
  let b = 2*dot(ray,ray_dir);
  let c = dot(ray, ray) - sphere_r*sphere_r;

  let discriminant = b*b - 4*a*c;

  // we only have interaction when we have a root 
  if(discriminant < 0 || isNaN(discriminant)){
    console.log("no roots");
    return null;
  }
  // return the min root
  else { 
    console.log("root found ",-1*(b+ Math.sqrt(discriminant)/(a*2.0)));
    return( -1*(b+ Math.sqrt(discriminant)/(a*2.0)));
  }
}

function cone_intersection()
{
  //TODO
}

// for checkinng if ray intersects with the floor
function floor_intersection()
{
  //TODO
}

// do with triangles using intersection calculations in ray casting slides.
function polygonal_surface_intersection()
{
  //TODO
}

function triangle(a, b, c) {
  pointsArray.push(a);
  pointsArray.push(b);
  pointsArray.push(c);

  // normals are vectors

  normalsArray.push(a[0], a[1], a[2], 0.0);
  normalsArray.push(b[0], b[1], b[2], 0.0);
  normalsArray.push(c[0], c[1], c[2], 0.0);

  index += 3;
}

function divideTriangle(a, b, c, count) {
  if (count > 0) {
    var ab = mix(a, b, 0.5);
    var ac = mix(a, c, 0.5);
    var bc = mix(b, c, 0.5);

    ab = normalize(ab, true);
    ac = normalize(ac, true);
    bc = normalize(bc, true);

    divideTriangle(a, ab, ac, count - 1);
    divideTriangle(ab, b, bc, count - 1);
    divideTriangle(bc, c, ac, count - 1);
    divideTriangle(ab, bc, ac, count - 1);
  } 
  else {
    triangle(a, b, c);
  }
}

function tetrahedron(a, b, c, d, n) {
  divideTriangle(a, b, c, n);
  divideTriangle(d, c, b, n);
  divideTriangle(a, d, b, n);
  divideTriangle(a, c, d, n);
}

window.onload = function init() {
  canvas = document.getElementById("gl-canvas");

  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) {
    alert("WebGL isn't available");
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.8, 0.8, 0.8, 1.0);

  gl.enable(gl.DEPTH_TEST);

  //
  //  Load shaders and initialize attribute buffers
  //
  program = initShaders( gl, "vertex-shader", "fragment-shader" );
  gl.useProgram( program );

  ambientProduct = mult(lightAmbient, materialAmbient);
  diffuseProduct = mult(lightDiffuse, materialDiffuse);
  specularProduct = mult(lightSpecular, materialSpecular);

  // DRAWS SPHERE
  tetrahedron(va, vb, vc, vd, SPHERE_QUALITY);
  centroid4dim = mix(mix(va,vb,0.5),mix(vc,vd,0.5),0.5);
  centroid = vec3(centroid4dim[0],centroid4dim[1],centroid4dim[2])
  reflection_sphr = 1;
  transparency_sphr = 0;
  surface_color_sphr = vec3(0.20, 0.20, 0.20);

  var nBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

  var vNormal = gl.getAttribLocation(program, "vNormal");
  gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vNormal);

  var vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

  var vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);

  camPositionLoc = gl.getUniformLocation(program, 'cameraPosition');
  modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
  projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
  normalMatrixLoc = gl.getUniformLocation(program, "normalMatrix");

  gl.uniform4fv(
    gl.getUniformLocation(program, "ambientProduct"),
    flatten(ambientProduct)
  );
  gl.uniform4fv(
    gl.getUniformLocation(program, "diffuseProduct"),
    flatten(diffuseProduct)
  );
  gl.uniform4fv(
    gl.getUniformLocation(program, "specularProduct"),
    flatten(specularProduct)
  );
  gl.uniform4fv(
    gl.getUniformLocation(program, "lightPosition"),
    flatten(lightPosition)
  );
  gl.uniform1f(gl.getUniformLocation(program, "shininess"), materialShininess);

  render();
};

function render() {
  raytrace(5); //TODO: Make it work with a slider
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  cameraPosition = vec3(0,0,radius);

  modelViewMatrix = lookAt(cameraPosition, at, up);
  projectionMatrix = ortho(left, right, bottom, ytop, near, far);

  normalMatrix = [
    vec3(modelViewMatrix[0][0], modelViewMatrix[0][1], modelViewMatrix[0][2]),
    vec3(modelViewMatrix[1][0], modelViewMatrix[1][1], modelViewMatrix[1][2]),
    vec3(modelViewMatrix[2][0], modelViewMatrix[2][1], modelViewMatrix[2][2]),
  ];

  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
  gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
  gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix));
  gl.uniform3f(camPositionLoc, cameraPosition.x, cameraPosition.y, cameraPosition[2]);

  for (var i = 0; i < index; i += 3) gl.drawArrays(gl.TRIANGLES, i, 3);

  //IMPORTANT!! NOT REQUESTING ANOTHER FRAME FOR NOW
  //window.requestAnimFrame(render);
}
