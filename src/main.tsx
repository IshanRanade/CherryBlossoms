import basicVert from './shaders/basic.vert.wgsl?raw';
import basicFrag from './shaders/basic.frag.wgsl?raw';
import cubeObj from './meshes/cube.obj?raw';
import { Mesh } from './mesh.tsx';
import { getMvpMatrix } from './util/math'

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
async function initPipeline(device: GPUDevice, format: GPUTextureFormat, width: number, height: number,
    vertexCode: string, fragmentCode: string,
    meshIndexBuffer: Uint16Array, meshIndexBufferByteSize: number,
    meshVertexBuffer: Float32Array, meshVertexBufferByteSize: number,
    meshVertexByteSize: number, meshVertexBufferPositionOffset: number,
    meshVertexBufferNormalOffset: number, meshVertexBufferUVOffset: number) {

    const pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: device.createShaderModule({
                code: vertexCode,
            }),
            entryPoint: 'main',
            buffers: [
                {
                    arrayStride: meshVertexByteSize,
                    attributes: [
                        {
                            // position
                            shaderLocation: 0,
                            offset: meshVertexBufferPositionOffset,
                            format: 'float32x3',
                        },
                        {
                            // normal
                            shaderLocation: 1,
                            offset: meshVertexBufferNormalOffset,
                            format: 'float32x3',
                        },
                        {
                            // uv
                            shaderLocation: 2,
                            offset: meshVertexBufferUVOffset,
                            format: 'float32x2',
                        },
                    ],
                },
            ],
        },
        fragment: {
            module: device.createShaderModule({
                code: fragmentCode,
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
        size: [width, height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    const depthView = depthTexture.createView();

    // create vertex buffer
    const vertexBuffer = device.createBuffer({
        label: 'GPUBuffer store vertex',
        size: meshVertexBufferByteSize,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
    });
    new Float32Array(vertexBuffer.getMappedRange()).set(meshVertexBuffer);
    vertexBuffer.unmap();

    // create index buffer
    const indexCount = meshIndexBufferByteSize / 2;
    const indexBuffer = device.createBuffer({
        label: 'GPUBuffer store indices',
        size: meshIndexBufferByteSize,
        usage: GPUBufferUsage.INDEX,
        mappedAtCreation: true,
    });
    new Uint16Array(indexBuffer.getMappedRange()).set(meshIndexBuffer);
    indexBuffer.unmap();

    const uniformBufferSize = 4 * 16; // 4x4 matrix
    const uniformBuffer = device.createBuffer({
        size: uniformBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
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

    return { pipeline, depthTexture, depthView, vertexBuffer, indexBuffer, indexCount, uniformBuffer, uniformBindGroup };
}

function draw(
    device: GPUDevice,
    context: GPUCanvasContext,
    pipelineObj: {
        pipeline: GPURenderPipeline,
        depthTexture: any,
        depthView: any,
        vertexBuffer: GPUBuffer,
        indexBuffer: GPUBuffer,
        indexCount: number,
        uniformBuffer: GPUBuffer,
        uniformBindGroup: GPUBindGroup
    }
) {
    // start encoder
    const commandEncoder = device.createCommandEncoder()
    const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [
            {
                view: context.getCurrentTexture().createView(),
                clearValue: { r: 1, g: 0, b: 0, a: 1.0 },
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

    passEncoder.setBindGroup(0, pipelineObj.uniformBindGroup);
    passEncoder.setVertexBuffer(0, pipelineObj.vertexBuffer);
    passEncoder.setIndexBuffer(pipelineObj.indexBuffer, 'uint16');
    passEncoder.drawIndexed(pipelineObj.indexCount);
    
    passEncoder.end()
    // webgpu run in a separate process, all the commands will be executed after submit
    device.queue.submit([commandEncoder.finish()])
}

async function run() {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
        throw new Error('No Canvas')
    }
    let mesh1 = await Mesh.createMeshWithText(cubeObj);

    const { device, context, format, size } = await initWebGPU(canvas);
    const pipelineObj = await initPipeline(device, format, size.width, size.height, basicVert, basicFrag,
        mesh1.getIndexBuffer(), mesh1.getIndexBufferByteSize(), mesh1.getVertexBuffer(), mesh1.getVertexBufferByteSize(),
        mesh1.vertexSize, mesh1.positionOffset, mesh1.normalOffset, mesh1.uvOffset);

    // start loop
    function frame() {
        // first, update two transform matrixs
        {
            // first cube
            const mvpMatrix1 = getMvpMatrix();
            device.queue.writeBuffer(
                pipelineObj.uniformBuffer,
                0,
                mvpMatrix1
            );
        }
        
        // then draw
        draw(device, context, pipelineObj)
        requestAnimationFrame(frame)

        console.log('frame');
    }
    frame()
}

run();