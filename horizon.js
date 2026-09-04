/* framework by me, cowork with ChatGPT and Claude*/
class Horizon{

    #svg;
    #ref = null;
    #ref_setter = Horizon.#nop_ref;
    #rotation_transform = null;
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
        this.update_rotation_transform();
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

    /*
      this.#rotation_transform({alpha,beta,gamma}) -> angle
      angle === null => failed to get angle
      angle <- [0,180] => angle 
         |    /
         |   / angle (_ anticlockwise turn to /)
         |  /______
         legend: 
             | user
             / phone
             _ horizons
         note: 
              1. phone screen face to user
              2. angle === 180 return as 0
         
    */
    update_rotation_transform(){
       let type = screen.orientation?.angle ?? -1;
       switch (type) {
           case 0:
               this.#rotation_transform = ({beta}) => {
                   if(0 <= beta && beta <= 180){
                       return beta % 180;
                   }else{
                       return null;
                   }
               };
               break;
           case 180:
               this.#rotation_transform = ({beta}) => {
                   if(-180 <= beta && beta <= 0){
                       return (beta + 180) % 180;
                   }else{
                       return null;
                   }
               };
               break;
           case 90:
               this.#rotation_transform = ({gamma}) => {
                   if(-90 <= gamma && gamma <= 90){
                       return (-gamma + (gamma <= 0 ? 0 : 180)) % 180;
                   }else{
                       return null;
                   }
               };
               break;
           case 270:
               this.#rotation_transform = ({gamma}) => {
                   if(-90 <= gamma && gamma <= 90){
                       return (gamma + (0 <= gamma ? 0 : 180)) % 180;
                   }else{
                       return null;
                   }
               };
               break;
           default:
               this.#rotation_transform = (_) => null;
               break;
       } 
    }
    
}
