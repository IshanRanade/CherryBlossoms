import basicVert from './shaders/basic.vert.wgsl?raw';
import basicFrag from './shaders/basic.frag.wgsl?raw';
import cubeObj from './meshes/cube.obj?raw';
import { Mesh } from './mesh.tsx';

async function initWebGPU(canvas: HTMLCanvasElement) {
    if (!navigator.gpu) {
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
    const size = { width: canvas.width, height: canvas.height };
    context.configure({
        device, format,
        // prevent chrome warning after v102
        alphaMode: 'opaque'
    });
    return { device, context, format, size };
}

// create pipiline & buffers
async function initPipeline(device: GPUDevice, format: GPUTextureFormat, size: { width: number, height: number }) {
    const pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: device.createShaderModule({
                code: basicVert,
            }),
            entryPoint: 'main',
            buffers: [
                {
                    arrayStride: cubeVertexSize,
                    attributes: [
                        {
                            // position
                            shaderLocation: 0,
                            offset: cubePositionOffset,
                            format: 'float32x4',
                        },
                        {
                            // uv
                            shaderLocation: 1,
                            offset: cubeUVOffset,
                            format: 'float32x2',
                        },
                    ],
                },
            ],
        },
        fragment: {
            module: device.createShaderModule({
                code: basicFrag,
            }),
            entryPoint: 'main',
            targets: [
                {
                    format: format,
                },
            ],
        },
        primitive: {
            topology: 'triangle-list',

            // Backface culling since the cube is solid piece of geometry.
            // Faces pointing away from the camera will be occluded by faces
            // pointing toward the camera.
            cullMode: 'back',
        },

        // Enable depth testing so that the fragment closest to the camera
        // is rendered in front.
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus',
        },
    });

    const depthTexture = device.createTexture({
        size: [size.width, size.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    const depthView = depthTexture.createView();

    // create vertex buffer
    const vertexBuffer = device.createBuffer({
        label: 'GPUBuffer store vertex',
        size: cubeVertexSize * cubeVertexCount,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexBuffer, 0, cubeVertexArray);

    const uniformBufferSize = 4 * 16; // 4x4 matrix
    const uniformBuffer = device.createBuffer({
        size: uniformBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformBindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: uniformBuffer,
                },
            },
        ],
    });

    const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [
            {
                view: undefined, // Assigned later

                clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store',
            },
        ],
        depthStencilAttachment: {
            view: depthTexture.createView(),

            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
        },
    };

    return { pipeline, depthTexture, depthView, vertexBuffer, mvpBuffer1, mvpBuffer2, group1, group2 };
}

function draw(
    device: GPUDevice,
    context: GPUCanvasContext,
    pipelineObj: {
        pipeline: GPURenderPipeline,
        vertexBuffer: GPUBuffer,
        mvpBuffer1: GPUBuffer,
        mvpBuffer2: GPUBuffer,
        group1: GPUBindGroup,
        group2: GPUBindGroup,
        depthView: GPUTextureView
    }
) {
    // start encoder
    const commandEncoder = device.createCommandEncoder()
    const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [
            {
                view: context.getCurrentTexture().createView(),
                clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store'
            }
        ],
        depthStencilAttachment: {
            view: pipelineObj.depthView,
            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
        }
    }
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)
    passEncoder.setPipeline(pipelineObj.pipeline)
    // set vertex
    passEncoder.setVertexBuffer(0, pipelineObj.vertexBuffer)
    {
        // draw first cube
        passEncoder.setBindGroup(0, pipelineObj.group1)
        passEncoder.draw(cube.vertexCount)
        // draw second cube
        passEncoder.setBindGroup(0, pipelineObj.group2)
        passEncoder.draw(cube.vertexCount)
    }
    passEncoder.end()
    // webgpu run in a separate process, all the commands will be executed after submit
    device.queue.submit([commandEncoder.finish()])
}

async function run() {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
        throw new Error('No Canvas')
    }
    const { device, context, format, size } = await initWebGPU(canvas);

    console.log(cubeObj);
    //let mesh1 = await Mesh.createMesh('./meshes/cube.obj');

    // const pipelineObj = await initPipeline(device, format, size)
    // // defaut state
    // let aspect = size.width / size.height
    // const position1 = { x: 2, y: 0, z: -8 }
    // const rotation1 = { x: 0, y: 0, z: 0 }
    // const scale1 = { x: 1, y: 1, z: 1 }
    // const position2 = { x: -2, y: 0, z: -8 }
    // const rotation2 = { x: 0, y: 0, z: 0 }
    // const scale2 = { x: 1, y: 1, z: 1 }
    // // start loop
    // function frame() {
    //     // first, update two transform matrixs
    //     const now = Date.now() / 1000
    //     {
    //         // first cube
    //         rotation1.x = Math.sin(now)
    //         rotation1.y = Math.cos(now)
    //         const mvpMatrix1 = getMvpMatrix(aspect, position1, rotation1, scale1)
    //         device.queue.writeBuffer(
    //             pipelineObj.mvpBuffer1,
    //             0,
    //             mvpMatrix1
    //         )
    //     }
    //     {
    //         // second cube
    //         rotation2.x = Math.cos(now)
    //         rotation2.y = Math.sin(now)
    //         const mvpMatrix2 = getMvpMatrix(aspect, position2, rotation2, scale2)
    //         device.queue.writeBuffer(
    //             pipelineObj.mvpBuffer2,
    //             0,
    //             mvpMatrix2
    //         )
    //     }
    //     // then draw
    //     draw(device, context, pipelineObj)
    //     requestAnimationFrame(frame)
    // }
    // frame()

    console.log('Done2');
}

run();