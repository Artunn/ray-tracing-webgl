var canvas;
var gl;
//
//var centroid,centroid2;
var outer_space_color = vec3(0, 0, 0);

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

var index = 0;

var pointsArray = [];
var normalsArray = [];

const initialredx = 0.0, initialredy = 0.2, initialredz = -0.5, initiallightx =  0.1, initiallighty =  0.6, initiallightz = -0.5;

var redx = 0.0, redy = 0.2,redz = -0.5;
var lightx = 0.1,lighty = 0.6, lightz= -0.5;
var reflect1 = 0.5,reflect2 = 0.5, reflect3= 0.5;

var lightPosition = vec3(lightx, lighty, lightz);//vec3(0.1,1, 0.2);
light_intensity = 15;

var normalMatrix, normalMatrixLoc;

var cameraPosition;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

SPHERE_QUALITY = 5;

var imageSize = 200;

// Create image data
// Here i used Uint8ClampedArray instead of Uint8Array so that it is clamped.
// * 3 is for dimension
var image = new Uint8ClampedArray(imageSize * imageSize * 3);

// Texture coords for quad
var canvas;
var gl;

var program;

var texture;

var depth_byuser = 3;

// Ray tracing function - top lvl fnc
function raytrace()
{
  for (var y = 0; y < imageSize; ++y)
  {
    for (var x = 0; x < imageSize; ++x)
    {
      ////console.log(imageSize);
      pxl_x = ( x / imageSize - 0.5)*2;
      pxl_y = -1 * ( y / imageSize - 0.5)*2;
      pxl = vec3( pxl_x, pxl_y, 1.0);
      dir = normalize( pxl, false);

      // Get color
      var color = trace( pxl, dir, 0);
      ////console.log(":",color);

      // Set color values
      image[(y * imageSize + x) * 3 + 0] = 255 * color[0];
      image[(y * imageSize + x) * 3 + 1] = 255 * color[1];
      image[(y * imageSize + x) * 3 + 2] = 255 * color[2];
    }
  }
}

// fire a ray, return RGB
function trace( ray_orig, ray_dir, depth, isShadow) 
{
  // find the min distanced intersection after looping for each sphere
  var intersection = closest_ray_surface_intersection(ray_orig,ray_dir)

  // shade if intersection found
  if (intersection) {
    //console.log("depth:",depth);
    //{min_dist: mindist, distance: dist, sphere_index:mini,intersection_pt:intersection_pt_i };
    //console.log(intersection);
    return shade( intersection.intersection_pt, ray_dir, depth, intersection.sphere_index, isShadow);
  }
  // no intersection, use background color
  return outer_space_color; 
}

// return color emitted by surface in ray intersection
function shade( intersection_pt, ray_dir, depth, i, isShadow)
{
  //console.log(sphere_centroids)
  var sphere_clr = sphere_sc[i];
  var shadow;
  shadow_dir = subtract(lightPosition,intersection_pt);
  shadow_dir_n = normalize(shadow_dir);
  shadow_dir_unitv = shadow_dir[0] / shadow_dir_n[0];
  var surface_color = vec3(0,0,0); // surface color to be calculated and returned.
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

  var fresnel_effect = Math.min( 1 / ( 0.9 + 0.2 * shadow_dir_unitv + 0.9 * Math.pow( shadow_dir_unitv, 3 ) ), 1 );//0.1 + (Math.pow(1 - facing_ratio, 3)) * 0.9;
 //console.log(fresnel_effect);
  var light_i = 0.3 + light_intensity * fresnel_effect * ( ( 0.5 * dot( intersection_n, shadow_dir_n ) ) + 0.7 * Math.pow( dot( intersection_n, shadow_dir_n ), 4 ) );
  if(sphere_ref[i] >= 0.0 && depth < depth_byuser) {
    // calculate REFLECTION direction & normalize
    var m = (2 * dot( ray_dir, intersection_n));
    var reflection_dir = vec3(subtract(ray_dir, intersection_n.map(x => x * m)));
    reflection_dir = normalize( reflection_dir, false);


  // var facing_ratio = dot(ray_dir,intersection_n)*(-1);

    reflection = trace( add(intersection_pt,intersection_n.map(x => x * bias)), reflection_dir, depth+1, false);
    shadow = trace( add(intersection_pt,intersection_n.map(x => x * bias)), reflection_dir, depth+1, true);
    //onsole.log(reflection);
    //return add(sphere_sc[m].map(x =>x * sphere_ref[i]), (sphere_clr. map(x => x* (1 - sphere_ref[i]))));
    //console.log(":reflection ",depth,reflection);

    // TRANSPARENCY - calculate REFRACTION for transparent objects
    if(sphere_tr[i] > 0)
    {
      //TODO
      var refraction_dir;
    }
    //TODO -add refraction after transparency is implemented.
    // surface_color = vec3(mult(reflection.map(x => x * fresnel_effect), sphere_sc[i])); 
    // surface_color = vec3(mult(reflection, sphere_sc[i]));
    //console.log("SHADED: ",depth,vec3(mult(reflection.map(x => x * fresnel_effect), sphere_sc[i])));

    //return vec3(sphere_clr.map(x=> x*light_i)); 
    let ssss = sphere_clr.map(x=> x*light_i);
    //console.log(ssss,reflection,reflection.map(x => x * fresnel_effect))

    return isShadow ? vec3(0,0,0) : vec3(mix(reflection, sphere_clr.map(x => x *light_i ), parseFloat(1 - sphere_ref[i])));
    return vec3(mix(reflection, sphere_clr.map(x => x *light_i ), parseFloat(1 - sphere_ref[i])));
  }
  // }else if(sphere_ref[i] == 0.0 && depth < depth_byuser){
  //   var m = (2 * dot( ray_dir, intersection_n));
  //   var reflection_dir = vec3(subtract(ray_dir, intersection_n.map(x => x * m)));
  //   reflection_dir = normalize( reflection_dir, false);


  // // var facing_ratio = dot(ray_dir,intersection_n)*(-1);


  //   reflection = trace( add(intersection_pt,intersection_n.map(x => x * bias)), reflection_dir, depth+1, true);
  //   //console.log(reflection);

  //   return vec3(mix(reflection , sphere_clr.map(x => x * light_i), parseFloat(1 - sphere_ref[i])));
  // }
  
  //TODO
  //console.log("surface_color",surface_color);
  //console.log("sphere_em",sphere_em[i]);
  //var finalMatrix = add(surface_color,sphere_em[i]);
  //console.log("returned:",finalMatrix);
  for(var j = 0; j < sphere_r.length; j++)
  {
    var intersectedsphere =  closest_ray_surface_intersection( sphere_centroids[i], shadow_dir, j);
      if(intersectedsphere){
        if(j == intersectedsphere.sphere_index){
          return sphere_sc[i];
        }
        else{
          return sphere_clr.map(x=> (x * 0.7) + (light_i * 0.3));
        }
        ////console.log("SHADOW: ",depth,vec3(0,0,0));
        //return vec3(sphere_clr.map(x=> x*light_i))
        
      }
  
  }
  //console.log("ELSE: ",depth,sphere_sc[i]);
  return sphere_sc[i];

  //return finalMatrix;

  //return vec3(sphere_clr.map(x=> x*light_i));
}

function closest_ray_surface_intersection( ray_orig, ray_dir)
{
  // find every point of intersection of each object with the ray. 
  // Return the closest intersection in a bundle that contains info such as surface normal, pointer to surface color info, etc.
  var mindist = Number.MAX_SAFE_INTEGER;
  var dist;
  var mini = -1;
  var intersection_pt_i;
  for(var i = 0; i < sphere_r.length; i++)
  {
    var object_point = sphere_intersection(sphere_centroids[i], sphere_r[i], ray_orig, ray_dir);
  
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
  if(mini == -1){
    return null;
  }else{
    return {min_dist: mindist, distance: dist, sphere_index:mini,intersection_pt:intersection_pt_i };
  }
}

// find and calculate nearest intersection points
function sphere_intersection(sphere_center, sphr_r, ray_orig, ray_dir)
{
  ray = vec3(subtract(ray_orig,sphere_center));

  //d
  // formulate discriminant formula
  let a = dot(ray_dir, ray_dir);
  let b = 2*dot(ray_dir,ray);
  let c = dot(ray, ray) - sphr_r*sphr_r;

  let discriminant = b*b - 4*a*c;

  // we only have interaction when we have a root 
  if(discriminant < 0 || isNaN(discriminant)){
    ////console.log("no roots");
    return null;
  }
  // return the min root
  else { 
    ////console.log("root found ",-1*(b+ Math.sqrt(discriminant)/(a*2.0)));
    //return( Math.min( -1*(b+ Math.sqrt(discriminant)/(2.0)), -1*(b - Math.sqrt(discriminant)/(2.0)) ));
    return -1*(b+ Math.sqrt(discriminant)/(2.0)), -1*(b - Math.sqrt(discriminant)/(2.0));
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

function resetSpheres() {
  sphere_centroids = [];
  sphere_tr = [];
  sphere_sc = [];
  sphere_ref = [];
  sphere_r = [];
  sphere_em = [];
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

  texture = gl.createTexture();
  gl.bindTexture( gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  // Set up texture parameters
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );

  // DRAWS SPHEREs

  //centroid, transparency_sphr, surface_color_sphr, reflection_sphr, sphr_r, sphr_em) {
  document.getElementById("redx").onchange = function () {
    redx = initialredx + parseFloat(event.srcElement.value);
    console.log(event.srcElement.value,initialredx,redx)
    render();
  };

  document.getElementById("redy").onchange = function () {
    redy = initialredy + parseFloat(event.srcElement.value);
    //console.log(event.srcElement.value)
    render();
  };

  document.getElementById("redz").onchange = function () {
    redz = initialredz + parseFloat(event.srcElement.value);
    ////console.log(event.srcElement.value)
    render();
  };

  document.getElementById("lightx").onchange = function () {
    lightx = initiallightx + parseFloat(event.srcElement.value);
    //console.log(event.srcElement.value)
    render();
  };

  document.getElementById("lighty").onchange = function () {
    lighty = initiallighty + parseFloat(event.srcElement.value);
    //console.log(event.srcElement.value)
    render();
  };

  document.getElementById("lightz").onchange = function () {
    lightz = initiallightz + parseFloat(event.srcElement.value);
    //console.log(event.srcElement.value)
    render();
  };

  document.getElementById("lightintensity").onchange = function () {
    light_intensity = 2.5 + parseFloat(event.srcElement.value);
    //console.log(event.srcElement.value)
    render();
  };

  document.getElementById("reflect1").onchange = function () {
    reflect1 = parseFloat(event.srcElement.value);
    //console.log(event.srcElement.value)
    render();
  };

  document.getElementById("reflect2").onchange = function () {
    reflect2 = parseFloat(event.srcElement.value);
    //console.log(event.srcElement.value)
    render();
  };

  document.getElementById("reflect3").onchange = function () {
    reflect3 = parseFloat(event.srcElement.value);
    //console.log(event.srcElement.value)
    render();
  };

  document.getElementById("depth").onchange = function () {
    depth_byuser = parseFloat(event.srcElement.value);
    //console.log(event.srcElement.value)
    render();
  };

  render();
};

function render() {
  //centroid, transparency_sphr, surface_color_sphr, reflection_sphr, sphr_r, sphr_em
  resetSpheres()
  fillSpheres(vec3(-redx, redy, redz), 0.2, vec3(1,0,0), reflect1, 0.09, vec3(  0.0, 0.0, 0.0));  
  fillSpheres(vec3( 0.0, -0.1, -0.5), 0.2, vec3(0, 1, 0), reflect2, 0.09, vec3( 0.0, 0.0, 0.0));
  fillSpheres(vec3( 0.2, -0.2, -0.5), 0.2, vec3(0,0,1), reflect3, 0.09, vec3(  0.0, 0.0, 0.0));

  lightPosition = vec3(-lightx, -lighty, lightz);
  raytrace();

  gl.enable(gl.DEPTH_TEST);
  gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

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
