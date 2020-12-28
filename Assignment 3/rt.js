var canvas;
var gl;
//
//var centroid,centroid2;
var outer_space_color = vec4(0.8, 0.8, 0.8, 1.0);

//var reflection_sphr;
//var transparency_sphr;
//var surface_color_sphr;
//var sphr_r;

var sphere_centroids = [];
var sphere_ref = [];
var sphere_tr = [];
var sphere_sc = [];
var sphere_r = [];
var sphere_em = [];
//
var numTimesToSubdivide = 3;

var index = 0;

var pointsArray = [];
var normalsArray = [];

var near = -10;
var far = 10;
//var radius = 2.5;
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

var lightPosition = vec3(1.0, 1.0, 1.0);
var light_Position = vec4(1.0, 1.0, 1.0, 0.0 );
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

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

var depth_byuser;

// Ray tracing function - top lvl fnc
function raytrace()
{
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
      var color = trace( pxl, dir, 0);
      //console.log(":",color);

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
  // find the min distanced intersection after looping for each sphere
  var mindist = Number.MAX_SAFE_INTEGER;
  var dist;
  var mini = -1;
  var intersection_pt_i;
  for(var i = 0; i < sphere_r.length; i++)
  {
    var object_point = closest_ray_surface_intersection( ray_orig, ray_dir, i);
  
    if(object_point){
      var intersection_pt = vec3(add(ray_orig, ray_dir.map(x => x * object_point))); // intersection point

      var v1 = ray_orig[0]- intersection_pt[0];
      var v2 = ray_orig[1]- intersection_pt[1];
      var v3 = ray_orig[2]- intersection_pt[2];
      dist = Math.sqrt(v1*v1 + v2*v2 + v3*v3);

      if( dist < mindist){
        mindist = dist;
        mini = i;
        intersection_pt_i = intersection_pt;
      }
    }
  }

  // shade if intersection found
  if (mini != -1) {
    console.log("depth:",depth);
    return shade( intersection_pt_i, ray_dir, depth, mini);
  }
  // no intersection, use background color
  return outer_space_color; 
}

// return color emitted by surface in ray intersection
function shade( intersection_pt, ray_dir, depth, i)
{
  //var surface_color = vec3(0,0,0); // surface color to be calculated and returned.
  var reflection;
  var refraction;
  var intersection_n = vec3(subtract(intersection_pt, sphere_centroids[i])); // normal at intersection poit
  intersection_n = normalize(intersection_n, false); 
  var bias = 1/10000;

  // check if we are inside the object, view rays and normal should be opposite
  var isInside = false;
  if( dot(ray_dir,intersection_n) > 0.0) {
    intersection_n = intersection_n.map(x => x * (-1))// -1*intersection_n;
    isInside = true;
  }
  
  if((sphere_ref[i] > 0.0 || sphere_tr[i] > 0.0) && depth < depth_byuser) {
    // calculate REFLECTION direction & normalize
    var m = (2 * dot( ray_dir, intersection_n));
    var reflection_dir = vec3(subtract(ray_dir, intersection_n.map(x => x * m)));
    reflection_dir = normalize( reflection_dir, false);

    var facing_ratio = dot(ray_dir,intersection_n)*(-1);
    var fresnel_effect = 0.1 + (Math.pow(1 - facing_ratio, 3)) * 0.9;

    // trace the reflection ray
    console.log(":< ",intersection_pt);
    console.log(":< ",intersection_n);
    console.log(":< ",intersection_n.map(x => x * bias));
    console.log(":< ",reflection_dir);
    console.log(":< ",add(intersection_pt,intersection_n.map(x => x * bias)));
    console.log(":< ",depth+1);
    reflection = trace( add(intersection_pt,intersection_n.map(x => x * bias)), reflection_dir, depth+1); 
    console.log(":reflection ",depth,reflection);

    // TRANSPARENCY - calculate REFRACTION for transparent objects
    if(sphere_tr[i] > 0)
    {
      //TODO
      var refraction_dir;
    }
    //TODO -add refraction after transparency is implemented.
    //surface_color = vec3(mult(reflection.map(x => x * fresnel_effect), sphere_sc[i])); 
    //surface_color = vec3(mult(reflection, sphere_sc[i]));
    console.log("SHADED: ",depth,vec3(mult(reflection.map(x => x * fresnel_effect), sphere_sc[i])));
    return vec3(mult(reflection.map(x => x * fresnel_effect), sphere_sc[i]));
  }
  // obj is OPAQUE, don't raytrace anymore.
  /*else{
    for(var j = 0; j < sphere_r.length; j++)
    {
      if(sphere_em[j].some(x => x !== 0)) {
        var transmission = vec3(1.0,1.0,1.0);
        var light_dir = vec3(subtract(sphere_centroids[j],intersection_pt));
        light_dir = normalize( light_dir, false);

        for(var k = 0; k < sphere_r.length; k++)
        {
          if( j != k){
            // SHADOW
            if( closest_ray_surface_intersection( sphere_centroids[k], light_dir, k)){
              transmission = vec3(0.1,0.1,0.1);
              return vec3(0,0,0);
              break;
            }
          }
        }
        console.log("----------------------->",sphere_sc[i]);
        console.log("----------------------->",transmission);
        var color_ = mult(sphere_sc[i],transmission).map(x => x * Math.max(0,dot(intersection_n,light_dir)*sphere_em[j]));
        surface_color = add(surface_color, color_);
        console.log("surface_colorrrrrrrrrrrrr",surface_color);
      }
    }
  }
  //TODO
  console.log("surface_color",surface_color);
  console.log("sphere_em",sphere_em[i]);
  var finalMatrix = add(surface_color,sphere_em[i]);
  console.log("returned:",finalMatrix);*/

  shadow_dir = subtract(lightPosition,intersection_pt);
  for(var j = 0; j < sphere_r.length; j++)
  {
    if( closest_ray_surface_intersection( sphere_centroids[j], shadow_dir, j)){
      console.log("SHADOW: ",depth,vec3(0,0,0));
      return vec3(0,0,0);
    }
  }
  console.log("ELSE: ",depth,sphere_sc[i]);
  return sphere_sc[i];

  return finalMatrix;
}

function closest_ray_surface_intersection( ray_orig, ray_dir, i)
{
  // find every point of intersection of each object with the ray. 
  // Return the closest intersection in a bundle that contains info such as surface normal, pointer to surface color info, etc.
  
  return sphere_intersection(sphere_centroids[i], sphere_r[i], ray_orig, ray_dir);
}

// find and calculate nearest intersection points
function sphere_intersection(sphere_center, sphr_r, ray_orig, ray_dir)
{
  ray = vec3(subtract(sphere_center,ray_orig));

  // formulate discriminant formula
  let a = dot(ray_dir, ray_dir);
  let b = 2*dot(ray,ray_dir);
  let c = dot(ray, ray) - sphr_r*sphr_r;

  let discriminant = b*b - 4*a*c;

  // we only have interaction when we have a root 
  if(discriminant < 0 || isNaN(discriminant)){
    //console.log("no roots");
    return null;
  }
  // return the min root
  else { 
    //console.log("root found ",-1*(b+ Math.sqrt(discriminant)/(a*2.0)));
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

function fillSpheres(centroid, transparency_sphr, surface_color_sphr, reflection_sphr, sphr_r, sphr_em) {
  sphere_centroids.push(centroid);
  sphere_tr.push(transparency_sphr);
  sphere_sc.push(surface_color_sphr);
  sphere_ref.push(reflection_sphr);
  sphere_r.push(sphr_r);
  sphere_em.push(sphr_em);
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

  var pointsArray = [];
  var texCoordsArray = [];

  // Use a quad to render texture 
  pointsArray.push(vec2(-1, -1));
  pointsArray.push(vec2(-1, 1));
  pointsArray.push(vec2(1, 1));
  pointsArray.push(vec2(1, -1));

  texCoordsArray.push(vec2(0, 0));
  texCoordsArray.push(vec2(0, 1));
  texCoordsArray.push(vec2(1, 1));
  texCoordsArray.push(vec2(1, 0));

  var tBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);

  var vTexCoord = gl.getAttribLocation( program, "vTexCoord");
  gl.vertexAttribPointer( vTexCoord, 2, gl.FLOAT, false, 0, 0 );
  gl.enableVertexAttribArray( vTexCoord );

  var vBuffer = gl.createBuffer();
  gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

  var vPosition = gl.getAttribLocation( program, "vPosition");
  gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray( vPosition);

    /*
  modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
  projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
  normalMatrixLoc = gl.getUniformLocation( program, "normalMatrix" );
*/
  texture = gl.createTexture();
  gl.bindTexture( gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  // Set up texture parameters
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );

  // DRAWS SPHEREs
  fillSpheres(vec3( 0.0, -0.1, 0.2), 0, vec3(0.20, 0.60, 0.80), 0.5, 0.05, vec3( 0.0, 0.0, 0.0));
  fillSpheres(vec3( 0.0, 0.1, 0.2), 0, vec3(0.60, 0.10, 0.80), 0.5, 0.05, vec3(  0.0, 0.0, 0.0));
  depth_byuser = 3;
/*
  gl.uniform4fv( gl.getUniformLocation(program, 
    "ambientProduct"),flatten(ambientProduct) );
  gl.uniform4fv( gl.getUniformLocation(program, 
    "diffuseProduct"),flatten(diffuseProduct) );
  gl.uniform4fv( gl.getUniformLocation(program, 
    "specularProduct"),flatten(specularProduct) );	
  gl.uniform4fv( gl.getUniformLocation(program, 
    "light_Position"),flatten(light_Position) );
  gl.uniform1f( gl.getUniformLocation(program, 
    "shininess"),materialShininess );
*/

  gl.uniform4fv( gl.getUniformLocation(program, 
  "light_Position"),flatten(light_Position) );

  render();
};

function render() {
  raytrace();

  gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

/*
  eye = vec3(radius*Math.sin(theta)*Math.cos(phi), 
  radius*Math.sin(theta)*Math.sin(phi), radius*Math.cos(theta));

  modelViewMatrix = lookAt(eye, at , up);
  projectionMatrix = ortho(left, right, bottom, ytop, near, far);


  normalMatrix = [
    vec3(modelViewMatrix[0][0], modelViewMatrix[0][1], modelViewMatrix[0][2]),
    vec3(modelViewMatrix[1][0], modelViewMatrix[1][1], modelViewMatrix[1][2]),
    vec3(modelViewMatrix[2][0], modelViewMatrix[2][1], modelViewMatrix[2][2])
  ];
          
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix) );
  gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) );
  gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix) );
  */  

  gl.bindTexture( gl.TEXTURE_2D, texture);
  gl.texImage2D(
      gl.TEXTURE_2D,    // target
      0,                // level
      gl.RGB,           // image format 
      imageSize,        // width
      imageSize,        // height
      0,                // Border
      gl.RGB,           // Format
      gl.UNSIGNED_BYTE, // type
      image             // Data source
  );

  gl.drawArrays( gl.TRIANGLE_FAN, 0, 4 );
}
