async function initWebGPU(canvas: HTMLCanvasElement) {
    if(!navigator.gpu) {
        throw new Error('WebGPU Not Supported');
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw new Error('No Adapter Found');
    }

    const device = await adapter.requestDevice();
    const context = canvas.getContext('webgpu') as GPUCanvasContext;
    const format = navigator.gpu.getPreferredCanvasFormat ? 
        navigator.gpu.getPreferredCanvasFormat() : context.getPreferredFormat(adapter);
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    const size = {width: canvas.width, height: canvas.height};
    context.configure({
        device, format,
        // prevent chrome warning after v102
        alphaMode: 'opaque'
    });
    return {device, context, format, size};
}

async function run() {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
        throw new Error('No Canvas')
    }
    const {device, context, format, size} = await initWebGPU(canvas);

    console.log('Done');
}
run();