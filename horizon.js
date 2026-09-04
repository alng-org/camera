/* framework by me*/
class Horizon{

    #svg;
    #ref = null;
    #ref_setter = Horizon.#nop_ref;
    #rotation_matrix = null;
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
        this.update_rotation_matrix();
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
       let type = screen.orientation?.type ?? "";
       switch (type) {
           case "portrait-primary":
               // this.#rotation_matrix =
               // beta 0 180
               break;
           case "portrait-secondary":
               // this.#rotation_matrix =
               // beta 0 -180
               break;
           case "landscape-primary":
               // this.#rotation_matrix =
               // gamma 0 -90 90 0
               break;
           case "landscape-secondary":
               // this.#rotation_matrix =
               // gamma 0 90 -90 0
               break;
           default:
               this.#rotation_matrix = null;
               break;
       } 
    }
    
}
