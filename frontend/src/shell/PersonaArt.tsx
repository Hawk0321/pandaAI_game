import { useEffect, useRef } from 'react';
import type { PersonaArtwork } from './personaArtwork';

type Region = readonly [number, number, number, number];
interface MotionRig { body: Region; head: Region; detail: Region; motion: Region; tint: readonly [number, number, number] }

// Coordinates are normalized in the source illustration. Local displacement leaves
// the scene edges fixed, so the character moves without sliding the entire picture.
const rigs: Record<string, MotionRig> = {
  bull: { body: [.50,.55,.30,.36], head: [.56,.28,.24,.19], detail: [.20,.18,.23,.13], motion: [.026,.009,.013,1.5], tint: [1,.66,.28] },
  owl: { body: [.58,.61,.25,.29], head: [.58,.28,.24,.23], detail: [.28,.52,.24,.14], motion: [.019,.008,.005,1.0], tint: [1,.83,.43] },
  shark: { body: [.50,.52,.29,.36], head: [.59,.23,.28,.18], detail: [.27,.77,.23,.20], motion: [.014,.008,.015,.85], tint: [.45,.88,1] },
  turtle: { body: [.50,.58,.30,.35], head: [.56,.23,.20,.17], detail: [.71,.68,.20,.24], motion: [.019,.005,.008,.75], tint: [.85,1,.45] },
  crab: { body: [.51,.52,.30,.22], head: [.57,.34,.23,.16], detail: [.27,.24,.23,.25], motion: [.019,.007,.016,1.25], tint: [1,.72,.35] },
  dolphin: { body: [.55,.46,.27,.33], head: [.64,.22,.24,.16], detail: [.41,.78,.24,.19], motion: [.014,.011,.015,.95], tint: [.50,.93,1] },
  fox: { body: [.53,.56,.25,.29], head: [.53,.24,.22,.23], detail: [.28,.74,.25,.24], motion: [.020,.009,.015,1.05], tint: [1,.82,.40] },
  sloth: { body: [.48,.52,.32,.23], head: [.46,.28,.23,.19], detail: [.69,.42,.17,.25], motion: [.016,.004,.005,.6], tint: [.94,1,.58] },
  hedgehog: { body: [.51,.59,.33,.29], head: [.54,.29,.25,.19], detail: [.66,.49,.24,.26], motion: [.028,.005,.010,1.15], tint: [1,.77,.42] },
};

const vertexSource = `attribute vec2 position;
varying vec2 uv;
void main() { uv = position * vec2(.5, -.5) + .5; gl_Position = vec4(position, 0., 1.); }`;

const fragmentSource = `precision mediump float;
varying vec2 uv;
uniform sampler2D illustration;
uniform float time;
uniform vec4 crop;
uniform vec4 body;
uniform vec4 head;
uniform vec4 detail;
uniform vec4 motion;
uniform vec3 tint;
float region(vec2 p, vec4 r) { vec2 d = (p - r.xy) / r.zw; return exp(-2.5 * dot(d, d)); }
void main() {
  vec2 p = uv * crop.xy + crop.zw;
  float t = time * motion.w;
  float breath = sin(t * 1.45);
  float sway = sin(t * .92);
  float edge = smoothstep(.025, .08, uv.x) * smoothstep(.025, .08, 1.-uv.x)
    * smoothstep(.025, .08, uv.y) * smoothstep(.025, .08, 1.-uv.y);
  vec2 displacement = (p - body.xy) * vec2(motion.x, motion.x * .6) * breath * region(p, body);
  displacement += vec2(motion.y * sway, -.003 * breath) * region(p, head);
  displacement += vec2(motion.z * sin(t * 1.15 + .8), motion.z * .45 * cos(t * 1.15)) * region(p, detail);
  vec3 color = texture2D(illustration, clamp(p - displacement * edge, 0., 1.)).rgb;
  // A few quiet drifting motes; they do not obscure the face or imply any score.
  float glow = 0.;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    vec2 mote = vec2(.10 + .8 * fract(fi * .618 + .17), fract(fi * .237 - time * .017));
    mote.x += .023 * sin(time * .6 + fi * 2.);
    vec2 d = (p - mote) * vec2(1., 1.1);
    float flicker = .55 + .45 * sin(time * 1.3 + fi * 3.);
    glow += exp(-dot(d,d) * 19000.) * .28 * flicker;
  }
  color += tint * glow * (1. - region(p, head) * .85) * edge;
  gl_FragColor = vec4(color, 1.);
}`;

export function PersonaArt({ artwork, alt, active, className }: {
  artwork: PersonaArtwork; alt: string; active: boolean; className?: string;
}) {
  const surface = useRef<HTMLSpanElement>(null);
  const poster = useRef<HTMLImageElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const allowed = useRef(active);
  const syncPlayback = useRef<() => void>(() => {});

  useEffect(() => { allowed.current = active; syncPlayback.current(); }, [active]);

  useEffect(() => {
    const element = surface.current!;
    const image = poster.current!;
    const output = canvas.current!;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let inView = false, disposed = false, ready = false, failed = false;
    let frame = 0, last = 0, elapsed = 0, count = 0;
    let gl: WebGLRenderingContext | null = null;
    let program: WebGLProgram | null = null, buffer: WebGLBuffer | null = null, texture: WebGLTexture | null = null;
    const shaders: WebGLShader[] = [];
    let draw = (_time: number) => {};

    function stop() { cancelAnimationFrame(frame); frame = 0; last = 0; }
    function fallback() {
      failed = true; ready = false; stop(); output.hidden = true;
      element.dataset.motionState = 'fallback';
    }
    function tick(now: number) {
      if (disposed || !ready) return;
      frame = requestAnimationFrame(tick);
      if (last && now - last < 1000 / 24) return;
      // A short capped delta prevents jumps when resuming from a background tab.
      elapsed += last ? Math.min((now - last) / 1000, .1) : 0;
      last = now;
      draw(elapsed);
      element.dataset.motionFrame = String(++count);
    }
    function sync() {
      const eligible = allowed.current && inView && !document.hidden && !reduced.matches;
      if (eligible && !ready && !failed && image.complete && image.naturalWidth) initialize();
      const playing = ready && eligible;
      if (playing) {
        element.dataset.motionState = 'playing';
        if (!frame) frame = requestAnimationFrame(tick);
      } else {
        stop();
        element.dataset.motionState = failed ? 'fallback' : 'paused';
        // Reduced-motion users see the original illustration, including on first load.
        output.hidden = !ready || reduced.matches;
      }
      if (playing) output.hidden = false;
    }
    syncPlayback.current = sync;

    function initialize() {
      if (disposed || ready || failed || !image.naturalWidth || !allowed.current || !inView || document.hidden || reduced.matches) return;
      try {
        gl = output.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true, powerPreference: 'low-power' });
        if (!gl) { fallback(); return; }
        function compile(type: number, source: string) {
          const shader = gl!.createShader(type);
          if (!shader) throw new Error('No shader');
          shaders.push(shader); gl!.shaderSource(shader, source); gl!.compileShader(shader);
          if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) throw new Error('Shader unavailable');
          return shader;
        }
        program = gl.createProgram();
        if (!program) throw new Error('No program');
        gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
        gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Program unavailable');
        gl.useProgram(program);
        buffer = gl.createBuffer();
        if (!buffer) throw new Error('No buffer');
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
        const position = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        texture = gl.createTexture();
        if (!texture) throw new Error('No texture');
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        const rig = rigs[artwork.id] ?? rigs.fox;
        for (const key of ['body','head','detail','motion'] as const) gl.uniform4fv(gl.getUniformLocation(program, key), rig[key]);
        gl.uniform3fv(gl.getUniformLocation(program, 'tint'), rig.tint);
        const timeUniform = gl.getUniformLocation(program, 'time');
        const cropUniform = gl.getUniformLocation(program, 'crop');
        draw = (seconds: number) => {
          if (!gl || !program) return;
          // Layout dimensions stay stable while an ancestor flips/tilts the card.
          const layoutWidth = element.clientWidth, layoutHeight = element.clientHeight;
          if (!layoutWidth || !layoutHeight) return;
          const ratio = Math.min(devicePixelRatio || 1, 1.5, 640 / Math.max(layoutWidth, layoutHeight));
          const width = Math.max(1, Math.round(layoutWidth * ratio));
          const height = Math.max(1, Math.round(layoutHeight * ratio));
          if (output.width !== width || output.height !== height) { output.width = width; output.height = height; }
          gl.viewport(0, 0, width, height);
          const scale = Math.max(layoutWidth / image.naturalWidth, layoutHeight / image.naturalHeight);
          const x = layoutWidth / (image.naturalWidth * scale), y = layoutHeight / (image.naturalHeight * scale);
          // Match the static image's object-fit: cover and object-position.
          const yPosition = className === 'persona-card-art' ? .45 : .5;
          gl.uniform4f(cropUniform, x, y, (1-x)*.5, (1-y)*yPosition);
          gl.uniform1f(timeUniform, seconds);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        };
        if (gl.isContextLost() || gl.getError() !== gl.NO_ERROR) throw new Error('Illustration texture unavailable');
        draw(0);
        if (gl.isContextLost() || gl.getError() !== gl.NO_ERROR) throw new Error('Illustration drawing unavailable');
        ready = true; sync();
      } catch { fallback(); }
    }
    const observer = new IntersectionObserver(entries => { inView = entries.some(entry => entry.isIntersecting); sync(); }, { threshold: .01 });
    observer.observe(element);
    const resize = new ResizeObserver(() => { if (ready) draw(elapsed); });
    resize.observe(element);
    function contextLost(event: Event) { event.preventDefault(); fallback(); }
    output.addEventListener('webglcontextlost', contextLost);
    image.addEventListener('load', initialize);
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', sync);
    if (image.complete) initialize();
    return () => {
      disposed = true; stop(); syncPlayback.current = () => {};
      observer.disconnect(); resize.disconnect();
      image.removeEventListener('load', initialize);
      document.removeEventListener('visibilitychange', sync); reduced.removeEventListener('change', sync);
      output.removeEventListener('webglcontextlost', contextLost);
      if (gl) {
        if (texture) gl.deleteTexture(texture); if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program); shaders.forEach(shader => gl!.deleteShader(shader));
      }
    };
  }, [artwork.id, artwork.image, className]);

  return <span ref={surface} className="persona-art-surface" data-motion-state="paused" data-motion-frame="0">
    <img ref={poster} className={className} {...{ fetchpriority: 'high' }} src={artwork.image} alt={alt} width="640" height="640" decoding="async" />
    <canvas ref={canvas} className="persona-motion-canvas" aria-hidden="true" hidden />
  </span>;
}
