class webgl2{

    static #report(error_message,on_console){
        if(on_console === true){
            console.error(error_message);
        }else{
            alert(error_message);
        }
    }

    static #complie(WebGL2_context,vertex_shader_src,fragment_shader_src,report_on_console){
        let abstract_complie = (TYPE,src) => {
            let shader = WebGL2_context.createShader(TYPE);
            WebGL2_context.shaderSource(shader,src);
            WebGL2_context.compileShader(shader);
            if(WebGL2_context.getShaderParameter(shader,WebGL2_context.COMPILE_STATUS) === false){
                webgl2.#report(
                    WebGL2_context.getShaderInfoLog(shader),
                report_on_console
                );
                return null;
            }else{
                return shader;
            }
        };

        let vs = abstract_complie(WebGL2_context.VERTEX_SHADER,vertex_shader_src);
        let fs = abstract_complie(WebGL2_context.FRAGMENT_SHADER,fragment_shader_src);
        if(vs !== null && fs !== null){
            let program = WebGL2_context.createProgram();
            WebGL2_context.attachShader(program,vs);
            WebGL2_context.attachShader(program,fs);
            WebGL2_context.linkProgram(program);
            return program;
        }else{
            return null;
        }
        
    }

    static direct_draw = Symbol("normal");
    static screen = Symbol("screen");
    static add = Symbol("add");

    static #draw(WebGL2_context,report_on_console,blend_mode){
        if(blend_mode === webgl2.direct_draw){
            WebGL2_context.disable(WebGL2_context.BLEND);
            WebGL2_context.clear(WebGL2_context.COLOR_BUFFER_BIT);
        }else{
            WebGL2_context.enable(WebGL2_context.BLEND);
            switch(blend_mode){

                case webgl2.screen:
                    WebGL2_context.blendEquation(WebGL2_context.FUNC_ADD);
                    WebGL2_context.blendFunc(
                        WebGL2_context.ONE_MINUS_DST_COLOR,
                        WebGL2_context.ONE
                    );
                    break;
                    
                case webgl2.add:
                    WebGL2_context.blendEquation(WebGL2_context.FUNC_ADD);
                    WebGL2_context.blendFunc(
                        WebGL2_context.ONE,
                        WebGL2_context.ONE
                    );
                    break;
                    
                default:
                    webgl2.#report(`blend mode ${blend_mode} is not defined`,report_on_console);
                    return null;
            }
        }
        WebGL2_context.drawArrays(WebGL2_context.TRIANGLES,0,6);
        return WebGL2_context;
    }


    static #export(WebGL2_canvas,target_canvas,report_on_console){
        target_canvas.width = WebGL2_canvas.width;
        target_canvas.height = WebGL2_canvas.height;
        
        let bitmaprenderer_context = target_canvas.getContext("bitmaprenderer");
        if(bitmaprenderer_context === null){
            webgl2.#report(`bitmaprenderer is not support or ${target_canvas} is set to a different context mode`,report_on_console);
            return null;
        }else{
            bitmaprenderer_context.transferFromImageBitmap(
                WebGL2_canvas.transferToImageBitmap()
            );
            return target_canvas;
        }
    }

    static #universal_vertex_shader_src(pos_variable = "std_pos"){
        return `\
#version 300 es
in vec2 ${pos_variable};
void main(){
    gl_Position = vec4(${pos_variable},0.0,1.0);
}`;
    }

    static #vxo(WebGL2_context,from_program,report_on_console,using_pos_variable = "std_pos"){
        let  reference = WebGL2_context.getAttribLocation(from_program,using_pos_variable);
        if(reference === -1){
            webgl2.#report(`pos variable ${using_pos_variable} is not found`,report_on_console);
            return {
                vao:null,
                vbo:null
            };
        }else{
            let vao = WebGL2_context.createVertexArray();
            WebGL2_context.bindVertexArray(vao);

            let vbo = WebGL2_context.createBuffer();
            WebGL2_context.bindBuffer(WebGL2_context.ARRAY_BUFFER,vbo);
            WebGL2_context.bufferData(
                WebGL2_context.ARRAY_BUFFER,
                new Float32Array([
                    -1,-1,
                    1,-1,
                    -1,1,
                    -1,1,
                    1,-1,
                    1,1
                ]),
                WebGL2_context.STATIC_DRAW
            );

            WebGL2_context.enableVertexAttribArray(reference);
            WebGL2_context.vertexAttribPointer(reference,2,WebGL2_context.FLOAT,false,0,0);

            WebGL2_context.bindVertexArray(null);
            WebGL2_context.bindBuffer(WebGL2_context.ARRAY_BUFFER,null);
            return {
                vao:vao,
                vbo:vbo
            };
        }
    }

    static #direct_fragment_shader_src(tex_img = "std_img",color_mat = "std_mat"){
        return `\
#version 300 es
precision highp float;
uniform sampler2D ${tex_img};
uniform mat4 ${color_mat};
out vec4 color_result;
void main(){
    ivec2 tex_size = textureSize(${tex_img},0);
    float Y = float(tex_size.y);
    mat4 pos_mat = mat4(
        1,      0,     0,  0,
        0,     -1,     0,  0,
        0,      0,     1,  0,
        0,  Y-1.0,     0,  1
    );
    color_result = ${color_mat} * texelFetch(
        ${tex_img},
        ivec2(
            (pos_mat * gl_FragCoord).xy
        ),
        0
    );
}`;
    }

    static #for_delete = Symbol("for delete");

    static #texture(WebGL2_context,tex_width,tex_height,from_program,report_on_console,tex_img = "std_img",color_mat = "std_mat"){
        let tex_ref = WebGL2_context.getUniformLocation(from_program,tex_img);
        let mat_ref = WebGL2_context.getUniformLocation(from_program,color_mat);
        if(tex_ref === null){
            webgl2.#report(`tex image ${tex_img} is not found`,report_on_console);
            return null;
        }else if(mat_ref === null){
            webgl2.#report(`color matrix ${color_mat} is not found`,report_on_console);
            return null;
        }else{
            let texture = WebGL2_context.createTexture();
            WebGL2_context.activeTexture(WebGL2_context.TEXTURE0);
            WebGL2_context.bindTexture(WebGL2_context.TEXTURE_2D,texture);
            WebGL2_context.uniform1i(tex_ref,0);
            WebGL2_context.texParameteri(
                WebGL2_context.TEXTURE_2D,
                WebGL2_context.TEXTURE_MIN_FILTER,
                WebGL2_context.NEAREST
            );
            WebGL2_context.texParameteri(
                WebGL2_context.TEXTURE_2D,
                WebGL2_context.TEXTURE_MAG_FILTER,
                WebGL2_context.NEAREST
            );
            WebGL2_context.pixelStorei(WebGL2_context.UNPACK_ALIGNMENT,1);
            let delete_texture = () =>{
                WebGL2_context.bindTexture(WebGL2_context.TEXTURE_2D, null);
                WebGL2_context.deleteTexture(texture);
            };
            return (image_bit_map, color_mat = webgl2.#for_delete) => {
                if(
                    image_bit_map === webgl2.#for_delete ||
                    color_mat === webgl2.#for_delete
                ){
                    delete_texture();
                    return null;
                }else if(
                    !(
                        image_bit_map instanceof ImageBitmap &&
                        image_bit_map.width === tex_width &&
                        image_bit_map.height === tex_height
                    )
                ){
                    webgl2.#report(
                        `Required ImageBitmap [width = ${tex_width} height = ${tex_height}]
                        Actual [width = ${image_bit_map.width} height = ${image_bit_map.height}]`,
                        report_on_console
                    );
                    return null;
                }else if(
                    !(
                        color_mat instanceof Float32Array &&
                        color_mat.length === 16
                    )
                ){
                    webgl2.#report(
                        `Required color mat should be Float32Array[16]`,
                        report_on_console
                    );
                    return null;
                }else{
                    WebGL2_context.activeTexture(WebGL2_context.TEXTURE0);
                    WebGL2_context.bindTexture(WebGL2_context.TEXTURE_2D,texture);
                    WebGL2_context.texImage2D(
                        WebGL2_context.TEXTURE_2D,
                        0,
                        WebGL2_context.RGBA,
                        WebGL2_context.RGBA,
                        WebGL2_context.UNSIGNED_BYTE,
                        image_bit_map
                    );
                    WebGL2_context.uniformMatrix4fv(mat_ref,false,color_mat);
                    return WebGL2_context;
                }
            };
        }
    }


    static no_export = null;

    static abstract_render(width,height,report_on_console = true){
        let offscreen_canvas = new OffscreenCanvas(width,height);
        let gl = offscreen_canvas.getContext("webgl2");
        let finally_delete = () => {
            gl?.getExtension(
                "WEBGL_lose_context"
            )?.loseContext();
            gl = null;
            
            offscreen_canvas.width = 0;
            offscreen_canvas.height = 0;
            offscreen_canvas = null;
            return null;
        };
        if(gl === null){
            webgl2.#report("WebGL2 is not support",report_on_console);
            return finally_delete();
        }else{
            let vs_src = webgl2.#universal_vertex_shader_src();
            let fs_src = webgl2.#direct_fragment_shader_src();
            let program = webgl2.#complie(
                gl,
                vs_src,
                fs_src,
                report_on_console
            );
            if(program === null){
                return finally_delete();
            }else{
                let {vao,vbo} = webgl2.#vxo(
                    gl,
                    program,
                    report_on_console
                );
                if(vao === null){
                    gl.deleteProgram(program);
                    return finally_delete();
                }else{
                    gl.useProgram(program);
                    gl.bindVertexArray(vao);

                    let partical_delete = () => {
                        gl.deleteProgram(program);
                        gl.deleteVertexArray(vao);
                        gl.deleteBuffer(vbo);
                        return finally_delete();
                    };
                    
                    let fcopy = webgl2.#texture(
                        gl,
                        width,
                        height,
                        program,
                        report_on_console
                    );

                    if(fcopy === null){
                        return partical_delete();
                    }else{
                        let first_abstract_pipeline = (pipeline) => (
                            image_bit_map,
                            color_mat = webgl2.color_id_mat,
                            blend_mode = webgl2.direct_draw,
                            target_canvas = webgl2.no_export
                        ) => pipeline(
                            image_bit_map,
                            color_mat,
                            webgl2.direct_draw, //fixed the blend mode
                            target_canvas
                        );
                        let full_delete = () => {
                            fcopy(webgl2.#for_delete); //delete texture
                            return partical_delete();
                        };
                        let abstract_pipeline = (
                            image_bit_map,
                            color_mat = webgl2.color_id_mat,
                            blend_mode = webgl2.direct_draw,
                            target_canvas = webgl2.no_export
                        ) => {
                            if(
                                fcopy(image_bit_map,color_mat) === null ||
                                webgl2.#draw(
                                    gl,
                                    report_on_console,
                                    blend_mode
                                ) === null
                            ){
                                return full_delete();
                            }else if(target_canvas === webgl2.no_export){
                                return abstract_pipeline;
                            }else if(
                                webgl2.#export(
                                    offscreen_canvas,
                                    target_canvas,
                                    report_on_console
                                ) === null
                            ){
                                return full_delete();
                            }else{
                                return first_abstract_pipeline(
                                    abstract_pipeline
                                );
                            }
                        };
                        return first_abstract_pipeline(
                            abstract_pipeline
                        );
                    }
                    
                }
            }
        }
    }

    static color_id_mat = webgl2.color_mat(
        webgl2.new_color(1,0,0,0),
        webgl2.new_color(0,1,0,0),
        webgl2.new_color(0,0,1,0),
        webgl2.new_color(0,0,0,1)
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
                    t instanceof Float32Array &&
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


class render{
    #rd = null;
    #closed = false;
    #report_on_console;
    constructor(width,height,report_on_console = true){
        this.#report_on_console = report_on_console;
        this.#rd = webgl2.abstract_render(
            width,
            height,
            this.#report_on_console
        );
    }
    draw(
        image_bit_map,
        color_mat = webgl2.color_id_mat,
        blend_mode = webgl2.direct_draw,
        target_canvas = webgl2.no_export
    ){
        this.#rd = this.#rd?.(
            image_bit_map,
            color_mat,
            blend_mode,
            target_canvas
        ) ?? null;
        if(this.#rd === null && this.#closed === false){
            this.#rd = webgl2.abstract_render(
                image_bit_map.width,
                image_bit_map.height,
                this.#report_on_console
            );
            this.#rd = this.#rd?.(
                image_bit_map,
                color_mat,
                blend_mode,
                target_canvas
            ) ?? null;
            this.#closed = (this.#rd === null);
            if(this.#closed === true){
                alert(
                    "Please Reload the Website"
                );
                return null;
            }else{
                return this;
            }
        }else{
            return this;
        }
    }
}

class dubois extends webgl2{

    static #left_mat(inv_alpha){
        return webgl2.color_mat(
                    webgl2.new_color(0.456,0.5,0.176,0),
                    webgl2.new_color(0,0,0,0),
                    webgl2.new_color(0,0,0,0),
                    webgl2.new_color(0,0,0,1 / inv_alpha)
                );
    }
    
    static #right_mat(inv_alpha){
        return  webgl2.color_mat(
                    webgl2.new_color(-0.043,-0.088,-0.002,0),
                    webgl2.new_color(0.378,0.734,-0.018,0),
                    webgl2.new_color(-0.072,0.212,1.131,0),
                    webgl2.new_color(0,0,0,1 / inv_alpha)
                );
    }

    static anaglyph(width,height){
        let rd = new render(width,height);
        return (target_canvas) => {
            return {
                draw_left_first: 
                    (left_image,right_image) =>
                        rd.draw(
                            left_image,
                            dubois.#left_mat(1)
                        ).draw(
                            right_image,
                            dubois.#right_mat(2),
                            webgl2.screen,
                            target_canvas
                        ),
                draw_right_first:
                    (left_image,right_image) =>
                        rd.draw(
                            right_image,
                            dubois.#right_mat(1)
                        ).draw(
                            left_image,
                            dubois.#left_mat(2),
                            webgl2.screen,
                            target_canvas
                        )
            };
        };        
    }

}

class direct extends webgl2{

    static draw(width,height){
        let rd = new render(width,height);
        return (target_canvas,image) =>{
            rd.draw(
                image,
                webgl2.color_id_mat,
                webgl2.direct_draw,
                target_canvas
            );
        };
    }


}


