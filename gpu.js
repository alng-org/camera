/**
 * search [Interface] for more info
 * webgpu [default]: webgpu impl
 * webgl2 [backup]: webgl2 impl
 */
class gpu{
    /*return Promise<[Interface]>*/
    static of(target_canvas,width,height){
        return webgpu.of(target_canvas,width,height)
                     .catch( 
                         __ => webgl2.of(target_canvas,width,height)
                     );
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
                    format: webgpu.#format,
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
                    format: webgpu.#format,
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

/* impl by Claude, under user guide
   fixed Y-Flip by me(user)
*/
class webgl2{

    static #vertex_src = `#version 300 es
void main(){
    float x = (float(gl_VertexID) - 1.0) * 3.0;
    float y = (gl_VertexID == 1) ? -3.0 : 1.0;
    gl_Position = vec4(x, y, 0.0, 1.0);
}`;

    static #fragment_src = `#version 300 es
precision highp float;

uniform sampler2D tex_a;
uniform mat4 mat_a;
uniform sampler2D tex_b;
uniform mat4 mat_b;

out vec4 out_color;

vec4 color(mat4 color_mat, sampler2D src_tex){
    ivec2 tex_size = textureSize(src_tex,0);
    float Y = float(tex_size.y);
    mat4 pos_mat = mat4(
        1,      0,     0,  0,
        0,     -1,     0,  0,
        0,      0,     1,  0,
        0,  Y-1.0,     0,  1
    );
    ivec2 coord = ivec2(
         (pos_mat * gl_FragCoord).xy
    );
    return color_mat * texelFetch(src_tex, coord, 0);
}

vec4 reduce(vec4 a, vec4 b){
    return a + b;
}

void main(){
    out_color = reduce(
        color(mat_a, tex_a),
        color(mat_b, tex_b)
    );
}`;

    static #compile(gl,type,src){
        let shader = gl.createShader(type);
        gl.shaderSource(shader,src);
        gl.compileShader(shader);
        if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
            console.error(gl.getShaderInfoLog(shader));
        }
        return shader;
    }

    static #program(gl){
        let vertex = webgl2.#compile(gl,gl.VERTEX_SHADER,webgl2.#vertex_src);
        let fragment = webgl2.#compile(gl,gl.FRAGMENT_SHADER,webgl2.#fragment_src);
        let program = gl.createProgram();
        gl.attachShader(program,vertex);
        gl.attachShader(program,fragment);
        gl.linkProgram(program);
        if(!gl.getProgramParameter(program,gl.LINK_STATUS)){
            console.error(gl.getProgramInfoLog(program));
        }
        return program;
    }

    static #texture(gl){
        let tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D,tex);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        return tex;
    }

    static #upload(gl,tex,image_bit_map){
        gl.bindTexture(gl.TEXTURE_2D,tex);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA16F,gl.RGBA,gl.HALF_FLOAT,image_bit_map);
    }

    static #configure_color_space(gl){
        if("drawingBufferColorSpace" in gl){
            try{
                gl.drawingBufferColorSpace = "display-p3";
            }catch(err){
                //PASS
            }
        }
    }

    static #pipeline(gl,target_canvas,width,height){
        webgl2.#configure_color_space(gl);

        let program = webgl2.#program(gl);
        let tex_a = webgl2.#texture(gl);
        let tex_b = webgl2.#texture(gl);
        let vao = gl.createVertexArray();

        let loc_tex_a = gl.getUniformLocation(program,"tex_a");
        let loc_mat_a = gl.getUniformLocation(program,"mat_a");
        let loc_tex_b = gl.getUniformLocation(program,"tex_b");
        let loc_mat_b = gl.getUniformLocation(program,"mat_b");

        let same_size = (image_bit_map_a,image_bit_map_b) =>
            [image_bit_map_a,image_bit_map_b].every(
                (tex) =>
                    tex instanceof ImageBitmap &&
                    tex.width === image_bit_map_a.width &&
                    tex.height === image_bit_map_a.height
            );

        /*[Interface]*/
        return (
            image_bit_map_a,
            color_mat_a = gpu.color_id_mat,
            image_bit_map_b = image_bit_map_a,
            color_mat_b = gpu.color_zero_mat
        ) => {
            if(
                !same_size(image_bit_map_a,image_bit_map_b) ||
                ![color_mat_a,color_mat_b].every(
                    (mat) => mat instanceof Float32Array && mat.length === 16
                )
            ){
                console.error("gpu>> Cannot render, you might have two images of different sizes");
                return;
            }

            target_canvas.width = image_bit_map_a.width;
            target_canvas.height = image_bit_map_a.height;
            gl.viewport(0,0,target_canvas.width,target_canvas.height);

            webgl2.#upload(gl,tex_a,image_bit_map_a);
            webgl2.#upload(gl,tex_b,image_bit_map_b);

            gl.useProgram(program);
            gl.bindVertexArray(vao);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D,tex_a);
            gl.uniform1i(loc_tex_a,0);
            gl.uniformMatrix4fv(loc_mat_a,false,color_mat_a);

            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D,tex_b);
            gl.uniform1i(loc_tex_b,1);
            gl.uniformMatrix4fv(loc_mat_b,false,color_mat_b);

            gl.clearColor(0,0,0,1);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.TRIANGLES,0,3);
        };
    }

    /*return Promise<[Interface]>*/
    static of(target_canvas,width,height){
        let gl = target_canvas.getContext(
            "webgl2",
            {
                colorSpace: "display-p3",
                alpha: false,
                powerPreference: "high-performance",
                preserveDrawingBuffer: true
            }
        );
        if(gl === null){
            return Promise.reject(new Error("webgl2 is not supported! "));
        }
        return Promise.resolve(webgl2.#pipeline(gl,target_canvas,width,height));
    }

}
