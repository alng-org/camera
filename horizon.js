/* framework by me*/
class Horizon{

    #svg;
    #ref = null;
    #ref_setter = Horizon.#nop_ref;
    #rotation_matrix;
    #show_able = true;

    static #nop_ref(it,__){
        return;
    }
    
    static #locked_ref(it,orientation){
        it.#ref_setter = Horizon.#nop_ref;
        it.#ref = orientation;
        it.#apply_visibility();
    }

    static #request_permission(){
        if(
            typeof DeviceOrientationEvent !== "undefined" &&
            typeof DeviceOrientationEvent.requestPermission === "function"
        ){
            return DeviceOrientationEvent.requestPermission().catch(() => "denied");
        }else{
            return Promise.resolve("granted");
        }
    }

    #apply_visibility(){
        this.#svg.style.visibility =
            (
                this.#ref !== null && 
                this.#show_able === true
            ) ? "visible" : "hidden";
    }

    #tracking(orientation){
        
    }

    #svg_init(){
        
    }

    constructor(svg){
        this.#svg = svg;
        this.#svg_init();
        this.#apply_visibility();
        Horizon.#request_permission().then(
            () => window.addEventListener(
                "deviceorientation",
                (orientation) => {
                    this.#ref_setter(this,orientation);
                    this.#tracking(orientation);
                }
            )
        );
    }

    static display_with(svg){
        return new Horizon(svg);
    }

    expect_locked(expect_what){
        if(expect_what === true){
            this.#ref_setter = Horizon.#locked_ref;
        }else{
            Horizon.#locked_ref(this,null);
        }
    }

    unable_show(){
        this.#show_able = false;
        this.#apply_visibility();
    }

    enable_show(){
        this.#show_able = true;
        this.#apply_visibility();
    }


    update_rotation_matrix(){
        
    }
    
}
