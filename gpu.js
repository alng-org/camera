/**
 * search [Interface] for more info
 * webgpu: webgpu impl
 * webgl2: webgl2 impl
 */
class gpu{
    /*return Promise<[Interface]>*/
    static of(target_canvas,width,height){
        //*
    }


    static color_zero_mat = gpu.color_mat(
        gpu.new_color(0,0,0,0),
        gpu.new_color(0,0,0,0),
        gpu.new_color(0,0,0,0),
        gpu.new_color(0,0,0,0)
    );

    static color_id_mat = gpu.color_mat(
        gpu.new_color(1,0,0,0),
        gpu.new_color(0,1,0,0),
        gpu.new_color(0,0,1,0),
        gpu.new_color(0,0,0,1)
    );
    
    static new_color(red_percent,green_percent,blue_percent,alpha_percent){
        return new Float32Array(
            [
                    red_percent,
                    green_percent,
                    blue_percent,
                    alpha_percent
               ]
        );
    }

    static color_mat(new_red,new_green,new_blue,new_alpha){
        if(
            [new_red,new_green,new_blue,new_alpha].every(
                (t) =>  
                    typeof(t) === "object" && 
                    t.constructor ===Float32Array.prototype.constructor &&
                    t.length === 4
            ) === true
        ){
            return new Float32Array(
                [
                    new_red[0],new_green[0],new_blue[0],new_alpha[0],
                    new_red[1],new_green[1],new_blue[1],new_alpha[1],
                    new_red[2],new_green[2],new_blue[2],new_alpha[2],
                    new_red[3],new_green[3],new_blue[3],new_alpha[3]
                ]
            );
        }else{
            return null;
        }
    }
}

class dubois{

    static #left_mat = gpu.color_mat(
        gpu.new_color(0.4561000, 0.5004840, 0.1763810, 0.0),
        gpu.new_color(-0.0400822, -0.0378246, -0.0157589, 0.0),
        gpu.new_color(-0.0152161, -0.0205971, -0.00546856, 0.0),
        gpu.new_color(0.0, 0.0, 0.0, 1.0)
    );
    
    static #right_mat = gpu.color_mat(
        gpu.new_color(-0.0434062, -0.0879330, -0.0015552, 0.0),
        gpu.new_color(0.3784760, 0.7336400, -0.0184503, 0.0),
        gpu.new_color(-0.0721527, -0.2125920, 1.1331900, 0.0),
        gpu.new_color(0.0, 0.0, 0.0, 1.0)
    );

    /* required [Interface] */
    static anaglyph(gpu_interface){
        return (left,right) => gpu_interface(left,dubois.#left_mat,right,dubois.#right_mat);
    }

}


class direct{

    /* required [Interface] */
    static draw(gpu_interface){
        return (image) => gpu_interface(image);
    }

}

/* impl by me, under Gemini guide */
class webgpu{

    static #format = "rgba16float";

    static #ushader(device){
        let src_code =`\
@vertex
fn vertex(@builtin(vertex_index) index: u32) -> @builtin(position) vec4<f32>{
    return  vec4<f32>(
                (f32(index) - 1.0) * 3.0,
                select(1.0, -3.0, index == 1u),
                0.0,
                1.0
            );
}

@group(0) @binding(0) var tex_a: texture_2d<f32>;
@group(0) @binding(1) var<uniform> mat_a: mat4x4<f32>;
@group(0) @binding(2) var tex_b: texture_2d<f32>;
@group(0) @binding(3) var<uniform> mat_b: mat4x4<f32>;
@fragment
fn fragment(@builtin(position) P: vec4<f32>) -> @location(0) vec4<f32> {
    return reduce(
        color(P,mat_a,tex_a),
        color(P,mat_b,tex_b)
    );
}
fn color(P: vec4<f32>, color_mat: mat4x4<f32>, src_tex: texture_2d<f32>) -> vec4<f32> {
    return color_mat * textureLoad( src_tex, vec2<i32>(P.xy), 0);
}
fn reduce(a: vec4<f32>,b: vec4<f32>) -> vec4<f32> {
    return a + b;
}`
        let shader = device.createShaderModule(
            {
                label:"ushader",
                code:src_code
            }
        );
        shader.getCompilationInfo().then(
            (info) => [...info.messages].map(console.error)
        );
        return shader;
    }

    static #pipeline(device,target_canvas,width,height){
        let shader = webgpu.#ushader(device);
        return device.createRenderPipelineAsync(
            {
                layout: "auto",
                vertex: {
                    module: shader,
                    entryPoint: "vertex"
                },
                fragment: {
                    module: shader,
                    entryPoint: "fragment",
                    targets: [
                        {
                            format: webgpu.#format
                        }
                    ]
                }
            }
        ).then(
            (pipeline) => {
                let type = pipeline.getBindGroupLayout(0);
                let group_0 = webgpu.#bind_group( device, type,width, height );
                let group_1 = webgpu.#bind_group( device, type,height, width );
                let group = (
                    image_bit_map_a,
                    color_mat_a,
                    image_bit_map_b,
                    color_mat_b
                ) => group_0(
                    image_bit_map_a,
                    color_mat_a,
                    image_bit_map_b,
                    color_mat_b
                ) ?? group_1(
                    image_bit_map_a,
                    color_mat_a,
                    image_bit_map_b,
                    color_mat_b
                ) ?? null;

                let context = target_canvas.getContext("webgpu");
                if(context === null){
                   throw new Error("webgpu is not supported! "); 
                }else{
                    context.configure(
                        {
                            device: device,
                            format: webgpu.#format,
                            colorSpace: "display-p3",
                            alphaMode: "opaque",
                            toneMapping: {
                                mode: "extended"
                            },
                            usage: GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
                        }
                    );

                    /*[Interface]*/
                    return (
                        image_bit_map_a,
                        color_mat_a = gpu.color_id_mat,
                        image_bit_map_b = image_bit_map_a,
                        color_mat_b = gpu.color_zero_mat
                    ) => {
                        let env = group(image_bit_map_a,color_mat_a,image_bit_map_b,color_mat_b);
                        if(env === null){
                            console.error("gpu>> Cannot render, you might have two images of different sizes");
                        }else{
                            target_canvas.width = image_bit_map_a.width;
                            target_canvas.height = image_bit_map_a.height;

                            let mapper = device.createCommandEncoder();
                            let mapping = mapper.beginRenderPass(
                                {
                                    colorAttachments: [
                                        {
                                            view: context.getCurrentTexture().createView(),
                                            clearValue: { r: 0, g: 0, b: 0, a: 1 },
                                            loadOp: "clear",
                                            storeOp: "store"
                                        }
                                    ]
                                }
                            );
                            mapping.setPipeline(pipeline);
                            mapping.setBindGroup(0,env);
                            mapping.draw(3);
                            mapping.end();
                            device.queue.submit(
                                [ mapper.finish() ]
                            );

                        }
                    };
                }
            }
        )
    }

    static #bind_group(device,type,width,height){
        if( [width,height].every(Number.isInteger) ){
            let tex_a = device.createTexture(
                {
                    size: [width,height,1],
                    format: gpu.#format,
                    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
                }
            );
            let mat_a = device.createBuffer(
                {
                    size: new Float32Array(16).byteLength,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
                }
            );
            let tex_b = device.createTexture(
                {
                    size: [width,height,1],
                    format: gpu.#format,
                    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
                }
            );
            let mat_b = device.createBuffer(
                {
                    size: new Float32Array(16).byteLength,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
                }
            );
            let bind_group = device.createBindGroup(
                {
                    layout: type,
                    entries: [
                        {
                            binding: 0,
                            resource: tex_a.createView()
                        },
                        {
                            binding: 1,
                            resource: mat_a
                        },
                        {
                            binding: 2,
                            resource: tex_b.createView()
                        },
                        {
                            binding: 3,
                            resource: mat_b
                        }
                    ]
                }
            );
            
            return (
                image_bit_map_a,
                color_mat_a = gpu.color_id_mat,
                image_bit_map_b = image_bit_map_a,
                color_mat_b = gpu.color_zero_mat
            ) => {
                if(
                    [image_bit_map_a,image_bit_map_b].every(
                        (tex) => 
                            tex instanceof ImageBitmap &&
                            tex.width === width &&
                            tex.height === height
                    ) &&
                    [color_mat_a,color_mat_b].every(
                        (mat) =>
                            mat instanceof Float32Array &&
                            mat.length === 16
                    )
                ){
                    device.queue.copyExternalImageToTexture(
                        { source: image_bit_map_a },
                        { texture: tex_a },
                        [ width, height ]
                    );
                    device.queue.copyExternalImageToTexture(
                        { source: image_bit_map_b },
                        { texture: tex_b },
                        [ width, height ]
                    );
                    device.queue.writeBuffer( mat_a, 0, color_mat_a );
                    device.queue.writeBuffer( mat_b, 0, color_mat_b );
                    return bind_group;
                }else{
                    console.error("gpu::#bind_group:: Typed Error");
                    return null;
                }
            };
        }else{
            throw Error("gpu::#bind_group(width,height)>> width and height must be int");
        }
    }

    /*return Promise<[Interface]>*/
    static of(target_canvas,width,height){
        return navigator.gpu.requestAdapter()
                        .then(
                            (adapter) => adapter.requestDevice()
                        ).then(
                            (device) => webgpu.#pipeline( device, target_canvas, width, height)
                        );
    }

}
