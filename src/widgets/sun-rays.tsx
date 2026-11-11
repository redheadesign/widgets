import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { useWidgetSettings } from './core';

const vertexSource = `
  attribute vec2 position;
  varying vec2 point;
  void main() {
    point = position;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentSource = `
  precision highp float;
  uniform float time;
  varying vec2 point;

  void main() {
    float radius = length(point);
    float angle = atan(point.y, point.x + 0.00001);
    float flow = angle + 0.075 * sin(6.5 * radius - time * 0.8) + time * 0.13;
    float longRays = pow(0.5 + 0.5 * cos(11.0 * flow + sin(3.0 * angle + time * 0.3)), 9.0);
    float shortRays = pow(0.5 + 0.5 * cos(17.0 * flow - 0.7 * sin(7.0 * angle)), 6.0);
    float reach = 0.73 + 0.12 * sin(5.0 * angle + time * 0.5) + 0.06 * cos(7.0 * angle);
    float taper = 1.0 - smoothstep(0.23, reach, radius);
    float shortTaper = 1.0 - smoothstep(0.27, 0.51, radius);
    float breathing = 0.84 + 0.16 * sin(3.0 * angle - time * 1.2);
    float threads = (0.81 * longRays * taper + 0.27 * shortRays * shortTaper) * breathing;
    float root = 0.21 * (1.0 - smoothstep(0.24, 0.4, radius));
    float alpha = min(0.92, threads + root);
    vec3 color = mix(vec3(1.0, 0.44, 0.10), vec3(1.0, 0.83, 0.39), 1.0 - smoothstep(0.26, 0.68, radius));
    gl_FragColor = vec4(color, alpha);
  }
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
}

function createSunRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl', {
    alpha: true, premultipliedAlpha: false, depth: false, stencil: false, antialias: false, powerPreference: 'low-power',
  });
  if (!gl) return null;
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  const dispose = () => {
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
  };
  if (program && vertex && fragment) {
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
  }
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!program || !buffer || !gl.getProgramParameter(program, gl.LINK_STATUS)) {
    dispose();
    return null;
  }

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.viewport(0, 0, canvas.width, canvas.height);
  const time = gl.getUniformLocation(program, 'time');

  return {
    draw(seconds: number) {
      gl.uniform1f(time, seconds);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose,
  };
}

export function SunRays() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clock = useRef(0);
  const { paused, speed, reducedMotion } = useWidgetSettings();
  const reduce = useReducedMotion() || reducedMotion;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reduce) return;
    const renderer = createSunRenderer(canvas);
    if (!renderer) return;
    renderer.draw(clock.current);
    canvas.dataset.ready = 'true';
    let frame = 0;
    let previous = 0;
    let lost = false;

    function draw(now: number) {
      if (previous) clock.current += Math.min(now - previous, 40) * speed / 1000;
      previous = now;
      renderer?.draw(clock.current);
      frame = requestAnimationFrame(draw);
    }

    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
    }

    function loseContext() {
      lost = true;
      stop();
      if (canvas) delete canvas.dataset.ready;
    }

    const observer = paused ? null : new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) stop();
      else if (!frame && !lost) frame = requestAnimationFrame(draw);
    });
    observer?.observe(canvas);
    canvas.addEventListener('webglcontextlost', loseContext);
    return () => {
      lost = true;
      stop();
      observer?.disconnect();
      delete canvas.dataset.ready;
      canvas.removeEventListener('webglcontextlost', loseContext);
      renderer.dispose();
    };
  }, [paused, reduce, speed]);

  return <span className="hw-sun-rays">
    <canvas className="hw-sun-shader" ref={canvasRef} width="144" height="144" />
  </span>;
}
