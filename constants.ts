import { DatasetId, DatasetConfig } from './types';

export const DATASETS: Record<DatasetId, DatasetConfig> = {
  [DatasetId.Temperature]: {
    id: DatasetId.Temperature,
    name: 'Temperature Anomaly',
    description: 'Deviations from established patterns showing heatwaves and cold snaps.',
    unit: 'Δ°C',
    min: -5,
    max: 5,
    gradient: 'linear-gradient(to right, transparent, #fcd34d, #ef4444)',
  },
  [DatasetId.Vegetation]: {
    id: DatasetId.Vegetation,
    name: 'Vegetation Health',
    description: 'Vegetation density and health index.',
    unit: 'NDVI',
    min: 0,
    max: 1,
    gradient: 'linear-gradient(to right, transparent, #bef264, #15803d)',
  },
  [DatasetId.Precipitation]: {
    id: DatasetId.Precipitation,
    name: 'Heavy Precipitation',
    description: 'Rainfall accumulation volume.',
    unit: 'mm',
    min: 0,
    max: 50,
    gradient: 'linear-gradient(to right, transparent, #7dd3fc, #1e40af)',
  },
  [DatasetId.Clouds]: {
    id: DatasetId.Clouds,
    name: 'Cloud Volume',
    description: '3D Cloud cover simulation.',
    unit: '%',
    min: 0,
    max: 100,
    gradient: 'linear-gradient(to right, transparent, #ffffff)',
  }
};

// GLSL Noise functions and Main Shader Logic
export const VERTEX_SHADER = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const FRAGMENT_SHADER = `
uniform float uTime;
uniform float uDay;
uniform int uMode; // 0=Temp, 1=Veg, 2=Precip, 3=Cloud
uniform float uOpacity;
uniform float uThreshold;
uniform bool uIsCube;
uniform float uTimeLength;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

// Simplex 3D Noise 
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) { 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  // First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;

  // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
  vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

  // Permutations
  i = mod289(i); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  // Gradients: 7x7 points over a square, mapped onto an octahedron.
  // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
  float n_ = 0.142857142857; // 1.0/7.0
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  //Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}

vec4 getTemperatureColor(float val) {
  // val is roughly -1 to 1.
  
  // We want to simulate specific "Heatwave blobs"
  // Cutoff everything below a certain threshold to simulate "normal" temp being invisible
  float cutoff = 0.25;
  
  // Re-normalize val from [0.25, 1.0] to [0.0, 1.0]
  float t = smoothstep(cutoff, 1.0, val);
  
  // Bright Yellow -> Orange -> Dark Red
  vec3 c1 = vec3(1.0, 0.95, 0.2); // Bright Yellow
  vec3 c2 = vec3(1.0, 0.4, 0.0);  // Orange
  vec3 c3 = vec3(0.6, 0.0, 0.0);  // Dark Red
  
  vec3 col;
  if (t < 0.5) {
    col = mix(c1, c2, t * 2.0);
  } else {
    col = mix(c2, c3, (t - 0.5) * 2.0);
  }
  
  // Opacity: sharper falloff to make them look like solid ghost objects
  float alpha = smoothstep(0.0, 0.3, t) * 0.85;
  
  return vec4(col, alpha);
}

vec4 getVegetationColor(float val) {
  vec3 dry = vec3(0.8, 0.8, 0.2);
  vec3 lush = vec3(0.1, 0.8, 0.2);
  float t = smoothstep(-0.1, 0.9, val);
  float alpha = smoothstep(-0.1, 0.4, val) * 0.7;
  return vec4(mix(dry, lush, t), alpha);
}

vec4 getPrecipitationColor(float val) {
  vec3 light = vec3(0.8, 0.9, 1.0);
  vec3 heavy = vec3(0.1, 0.3, 0.9);
  float t = smoothstep(0.0, 0.8, val);
  float alpha = smoothstep(0.0, 0.6, val) * 0.8;
  return vec4(mix(light, heavy, t), alpha);
}

void main() {
  float scale = 3.5;
  
  float zCoord = vPosition.z;
  
  if (!uIsCube) {
     zCoord += uDay * 0.05; // Animate flow in Globe mode
  } else {
     // Ensure continuity: The Z-axis is time. 
     // We scale zCoord less than x/y to make 'events' stretch along time (creating "tubes" of events)
     // rather than random noise per slice.
     zCoord *= 0.8; 
  }

  // Primary Structure
  float n = snoise(vec3(vPosition.x * scale, vPosition.y * scale, zCoord * scale));
  
  // Secondary Detail (simulating local variance)
  float n2 = snoise(vec3(vPosition.x * scale * 2.1 + 10.0, vPosition.y * scale * 2.1 + 10.0, zCoord * scale * 1.5)) * 0.4;
  
  float val = n + n2;

  // Global Thresholding (User controlled)
  // Shift val to make sure we have empty space for the threshold to work on
  if (val < uThreshold) {
    discard;
  }

  vec4 result = vec4(1.0);

  if (uMode == 0) {
    result = getTemperatureColor(val); 
  } else if (uMode == 1) {
    result = getVegetationColor(val);
  } else if (uMode == 2) {
    result = getPrecipitationColor(val);
  } else if (uMode == 3) {
    float cloud = smoothstep(0.3, 0.9, val);
    result = vec4(1.0, 1.0, 1.0, cloud);
  }

  // Apply Global Opacity
  result.a *= uOpacity;
  
  // Fake lighting to give volume
  vec3 lightDir = normalize(vec3(0.5, 1.0, 0.2));
  // Flat normal from plane? No, use vNormal from noise variation if possible, 
  // but since we are rendering flat slices, we need to fake the volume normal or just use basic lighting.
  // Using vNormal (which comes from the flat plane) makes it look flat.
  // Ideally we compute gradient of noise for normal, but for performance/simplicity in this demo:
  // We just modulate brightness by density (val)
  
  float lighting = 0.7 + 0.3 * val; 
  result.rgb *= lighting;

  gl_FragColor = result;
  
  #ifdef TRANSPARENT
    if (result.a < 0.01) discard;
  #endif
}
`;