export const vertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal, vPosition, vWorldPosition, vWorldNormal, vViewPosition;
void main() {
  vUv=uv; vPosition=position;
  vNormal=normalize(normalMatrix*normal);
  vec4 world=modelMatrix*vec4(position,1.);
  vWorldPosition=world.xyz; vWorldNormal=normalize(mat3(modelMatrix)*normal);
  vec4 view=modelViewMatrix*vec4(position,1.); vViewPosition=view.xyz;
  gl_Position=projectionMatrix*view;
}`;
export const noise = /* glsl */ `
float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,v=0.;for(int i=0;i<4;i++){v+=a*noise3(p);p=p*2.03+1.7;a*=.5;}return v;}
mat2 turn(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
`;
export const portalFragment = /* glsl */ `
uniform float uTime, uOpacity, uLayer;
varying vec2 vUv;
${noise}
void main(){
  vec2 p=(vUv-.5)*2.; p=turn(uTime*(.025+uLayer*.012)+uLayer)*p;
  float r=length(p), a=atan(p.y,p.x);
  if(r>.99) discard;
  float depth=sqrt(max(0.,1.-r*r));
  vec3 q=vec3(p*3.5,depth*1.7+uLayer*3.);
  float warp=fbm(q+vec3(0.,uTime*.025,uTime*.018));
  float spiral=sin(a*2.+r*10.-uTime*.10+warp*5.);
  float gas=fbm(q*1.65+vec3(spiral*.55,warp,uTime*.035));
  float filaments=pow(max(0.,1.-abs(spiral)) ,3.)*gas;
  float mask=(1.-smoothstep(.56,1.,r))*smoothstep(.08,.35,r);
  float density=(gas*.58+filaments*.8)*mask;
  vec3 color=mix(vec3(.12,.15,.40),vec3(.40,.58,.94),smoothstep(.35,.75,gas));
  color=mix(color,vec3(.65,.43,.77),warp*.38);
  color+=vec3(.30,.48,.65)*filaments;
  gl_FragColor=vec4(color,density*uOpacity);
}`;
export const planetFragment = /* glsl */ `
uniform float uTime,uType,uPulse,uOpacity,uRadius;
uniform vec3 uCenter,uRingNormal;
varying vec3 vPosition,vWorldPosition,vWorldNormal,vViewPosition,vNormal;
varying vec2 vUv;
${noise}
void main(){
  vec3 p=normalize(vPosition), lightDir=normalize(vec3(-.8,.7,1.2));
  vec3 n=normalize(vWorldNormal);
  float turbulence=fbm(p*8.+vec3(0.,uTime*.01,0.));
  float flow=uTime*.007;
  vec3 q=p; q.xz=turn(flow*(.6+sin(p.y*8.)*.25)+uPulse*.06)*q.xz;
  float grain=noise3(q*110.);
  vec3 col; float ocean=0.;
  if(uType<.5){
    float bands=sin(q.y*51.+turbulence*5.+sin(q.x*5.)*.5);
    float cloud=fbm(q*vec3(5.,22.,5.)+vec3(flow,0.,0.));
    col=mix(vec3(.017,.065,.20),vec3(.13,.38,.65),.35+cloud*.75+bands*.07);
    float storm=exp(-length((vUv-vec2(.65,.57))*vec2(32.,60.)));
    col=mix(col,vec3(.025,.07,.18),storm*.75);
    float wave=length(p-vec3(.25,.15,.95));
    float front=(wave-(1.-uPulse)*2.)*10.;
    float ripple=exp(-front*front)*uPulse;
    col+=vec3(.08,.23,.32)*ripple;
  } else if(uType<1.5){
    float bands=sin(q.y*78.+turbulence*4.)*.08+sin(q.y*22.)*.13;
    col=mix(vec3(.28,.23,.16),vec3(.80,.71,.51),.4+turbulence*.45+bands);
  } else if(uType<2.5){
    float waves=fbm(vec3(q.x*9.,q.y*28.,q.z*9.));
    float belt=sin(q.y*39.+waves*4.)*.5+.5;
    col=mix(vec3(.29,.14,.09),vec3(.81,.71,.55),smoothstep(.12,.85,belt));
    col=mix(col,vec3(.61,.37,.22),waves*.25);
    vec2 spot=(vUv-vec2(.67,.43))*vec2(20.,45.);
    float eye=exp(-dot(spot,spot));
    spot=turn(uPulse*.65*exp(-dot(spot,spot)*.25))*spot;
    col=mix(col,mix(vec3(.46,.13,.055),vec3(.74,.36,.18),noise3(vec3(spot*4.,flow+uPulse*.4))),eye*.85);
    col+=grain*.025;
  } else if(uType<3.5){
    float continent=fbm(q*3.4+vec3(.7,1.2,2.8));
    float land=smoothstep(.475,.51,continent); ocean=1.-land;
    float elevation=fbm(q*18.);
    vec3 ground=mix(vec3(.07,.19,.11),vec3(.39,.35,.22),smoothstep(.45,.72,elevation));
    ground=mix(ground,vec3(.81,.83,.76),smoothstep(.81,.96,abs(p.y)));
    col=mix(mix(vec3(.008,.045,.11),vec3(.025,.19,.28),turbulence),ground,land);
    float coast=1.-smoothstep(.006,.035,abs(continent-.49)); col+=coast*vec3(.012,.048,.035);
  } else {
    vec3 plasma=p*7.; plasma.xz=turn(uTime*.012)*plasma.xz;
    float flowNoise=fbm(plasma+vec3(0.,uTime*.06,0.));
    float cells=noise3(plasma*8.+flowNoise*3.);
    float veins=pow(1.-abs(cells*2.-1.),3.);
    col=mix(vec3(.48,.047,.006),vec3(1.,.52,.09),flowNoise*.9+veins*.25);
    col+=vec3(.30,.18,.04)*uPulse*veins;
  }
  float ndl=dot(n,lightDir), daylight=smoothstep(-.14,.75,ndl);
  float micro=(grain-.5)*.025;
  if(uType<3.5){
    col*=.035+daylight*.98+micro;
    float rim=pow(1.-max(dot(normalize(vNormal),normalize(-vViewPosition)),0.),4.);
    col+=vec3(.08,.19,.32)*rim*smoothstep(-.25,.6,ndl)*.42;
    vec3 viewDir=normalize(cameraPosition-vWorldPosition);
    col+=ocean*pow(max(dot(reflect(-lightDir,n),viewDir),0.),65.)*vec3(.45,.55,.57)*(1.+uPulse*.45);
    if(uType>2.5){float cities=step(.82,noise3(p*210.))*step(.52,fbm(p*8.));col+=cities*(1.-daylight)*vec3(.34,.19,.065)*(.6+uPulse);}
    if(uType>.5&&uType<1.5){
      vec3 offset=vWorldPosition-uCenter;
      float denominator=dot(lightDir,uRingNormal);
      float t=-dot(offset,uRingNormal)/denominator;
      float ringDistance=length(offset+lightDir*t)/uRadius;
      float shadow=smoothstep(1.26,1.34,ringDistance)*(1.-smoothstep(2.03,2.13,ringDistance))*step(.0,t);
      col*=1.-shadow*.58;
    }
  }else{col*=.83+daylight*.23;}
  gl_FragColor=vec4(col,uOpacity);
}`;
export const atmosphereFragment = /* glsl */ `
uniform vec3 uColor; uniform float uPulse,uOpacity;
varying vec3 vNormal,vViewPosition,vWorldNormal;
void main(){
  vec3 n=normalize(vNormal),v=normalize(-vViewPosition);
  float rim=pow(1.-max(dot(n,v),0.),3.8);
  float lit=smoothstep(-.3,.8,dot(normalize(vWorldNormal),normalize(vec3(-.8,.7,1.2))));
  gl_FragColor=vec4(uColor,rim*lit*(.28+uPulse*.24)*uOpacity);
}`;
export const cloudFragment = /* glsl */ `
uniform float uTime,uOpacity; varying vec3 vPosition,vWorldNormal;
${noise}
void main(){vec3 p=normalize(vPosition);float n=fbm(p*9.+vec3(uTime*.006,0.,0.));float clouds=smoothstep(.53,.69,n);float light=smoothstep(-.12,.8,dot(normalize(vWorldNormal),normalize(vec3(-.8,.7,1.2))));gl_FragColor=vec4(vec3(.77,.83,.84)*(.2+light*.8),clouds*.7*uOpacity);}
`;
export const ringFragment = /* glsl */ `
uniform float uTime,uPulse,uRadius,uOpacity; uniform vec3 uLight;
varying vec3 vPosition;
${noise}
void main(){
  float r=length(vPosition.xy)/uRadius,a=atan(vPosition.y,vPosition.x);
  float bands=.5+.5*sin(r*155.+sin(r*39.)*2.);
  float grain=hash(vec3(vPosition.xy*340.,1.));
  float density=.28+bands*.27+grain*.15;
  density*=mix(.15,1.,smoothstep(.014,.038,abs(r-1.77)));
  density*=smoothstep(1.28,1.34,r)*(1.-smoothstep(2.04,2.14,r));
  float proj=dot(vPosition,normalize(uLight));
  float dist=length(vPosition-normalize(uLight)*proj)/uRadius;
  float shadow=(1.-smoothstep(.92,1.06,dist))*(1.-step(0.,proj));
  vec3 col=mix(vec3(.32,.29,.25),vec3(.74,.69,.55),bands*.65+grain*.16);
  col*=1.-shadow*.85;
  float front=(r-1.28-(1.-uPulse)*1.1)*18.;
  float ripple=exp(-front*front)*uPulse;
  col+=vec3(.22,.20,.15)*ripple*(.7+.3*cos(a));
  gl_FragColor=vec4(col,density*uOpacity);
}`;
export const coronaFragment = /* glsl */ `
uniform float uTime,uPulse,uOpacity; varying vec2 vUv;
${noise}
void main(){
  vec2 p=(vUv-.5)*2.;float r=length(p),a=atan(p.y,p.x);
  float turbulent=fbm(vec3(p*8.,uTime*.05));
  float fingers=pow(.5+.5*sin(a*17.+turbulent*7.+uTime*.035),4.);
  float extent=.04+fingers*.055+turbulent*.035+uPulse*.025;
  float glow=exp(-max(0.,r-.565)/extent);
  float mask=smoothstep(.48,.585,r)*(1.-smoothstep(.84,1.,r));
  float prominence=pow(max(0.,sin(a*7.-uTime*.03)),12.)*turbulent;
  vec3 col=mix(vec3(.82,.13,.015),vec3(1.,.48,.09),turbulent);
  gl_FragColor=vec4(col,glow*mask*(.18+prominence*.35+uPulse*.12)*uOpacity);
}`;
export const starVertex = /* glsl */ `
uniform float uTime,uDpr,uImplode,uTravel,uTravelX,uTravelY,uDrift,uJourney,uDepth,uAspect,uWarp,uBurst;
uniform vec3 uCenter;
attribute float aSize,aSeed;
varying float vTwinkle,vSeed,vStretch;
varying vec2 vDirection;
void main(){
  // Wrap outside the view; each depth layer advances at a different rate.
  float depthTravel=mix(uTravel,uDrift,uJourney);
  float z=-uDepth-mod(-position.z-uDepth-depthTravel*.55,6.);
  float height=.8284*(8.+uDepth+6.);
  vec3 p=vec3(position.x*height*uAspect,
    (mod(position.y+uTravel*.035/(1.+uDepth*.1)+.7,1.4)-.7)*height,z);
  float recycledBrightness=1.;
  if(uJourney>.5){
    // Translate actual world vertices before projection, independently of parallax.
    // Different per-star periods avoid a recognizable repeating tile pattern.
    vec2 span=height*vec2(uAspect*(1.4+aSeed*.34),1.4+aSeed*.21);
    vec2 world=vec2(position.x*height*uAspect,position.y*height);
    world+=vec2(uTravelX*height*uAspect*.62/(1.+uDepth*.045),
      (uTravel*.12/(1.+uDepth*.065)-uTravelY*.62/(1.+uDepth*.045)+uDrift*.018)*height);
    // One buffer covers the equivalent of a 3x3 toroidal neighbourhood.
    // Only the outer perimeter wraps; both axes recycle independently.
    vec2 cycle=floor((world+span*.5)/span);
    p.xy=mod(world+span*.5,span)-span*.5;
    // Cycles change only beyond the viewport. No reseeding visible stars.
    recycledBrightness=.86+.14*sin(aSeed*61.+cycle.x*2.4+cycle.y*1.7);
    p.z+=uWarp*.4;
  }
  p.xy=mix(p.xy,uCenter.xy*(8.-p.z)/8.,uImplode*.94);
  p.z+=uImplode*4.;
  p.xy*=1.+uBurst*.32;
  vec4 mv=modelViewMatrix*vec4(p,1.);
  gl_Position=projectionMatrix*mv;
  float vBase=min(7.,aSize*uDpr*(12./-mv.z));
  vStretch=1.+(uWarp*9.+uBurst*10.)*smoothstep(.65,.9,aSeed);
  gl_PointSize=min(32.,vBase*vStretch);
  vStretch=gl_PointSize/max(vBase,.1);
  vec2 radial=gl_Position.xy/max(gl_Position.w,.1);
  // Stage trails have a fixed projected travel direction, never rotate with strength.
  vDirection=uJourney>.5 ? normalize(vec2(radial.x*.18,.8+radial.y*.18))
    : normalize(mix(vec2(radial.x*.35,1.),radial+vec2(.001),uBurst));
  vTwinkle=.72+.28*sin(uTime*(.2+aSeed*.24)+aSeed*55.);
  // Fade depth recycling so no star pops at a wrap boundary.
  float edge=mod(-position.z-uDepth-depthTravel*.55,6.);
  vTwinkle*=smoothstep(0.,.6,edge)*(1.-smoothstep(5.4,6.,edge))*recycledBrightness;
  vSeed=aSeed;
}
`;
export const starFragment = /* glsl */ `
uniform vec3 uColor; uniform float uReveal,uJourney;
varying float vTwinkle,vSeed,vStretch;
varying vec2 vDirection;
void main(){
  vec2 p=(gl_PointCoord-.5)*2.;
  vec2 direction=vec2(vDirection.x,-vDirection.y);
  vec2 q=vec2(dot(p,vec2(direction.y,-direction.x))*vStretch,dot(p,direction));
  float r=length(q);
  float a=exp(-r*r*3.2)*(1.-smoothstep(.25,1.,r));
  vec3 tint=mix(uColor,vec3(1.,.83,.66),step(.95,vSeed)*.45);
  gl_FragColor=vec4(tint,a*vTwinkle*uReveal/mix(sqrt(vStretch),1.,uJourney));
}
`;
export const hazeFragment = /* glsl */ `
uniform float uTime;uniform vec3 uColor;varying vec2 vUv;
${noise}
void main(){vec2 p=vUv*2.-1.;float mask=exp(-dot(p*vec2(1.,1.7),p*vec2(1.,1.7))*2.);float cloud=noise3(vec3(p*3.,uTime*.008))*.65+noise3(vec3(p*6.,uTime*.008))*.35;gl_FragColor=vec4(uColor,cloud*mask*.11);}
`;
