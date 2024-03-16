import LoggableType from "../../shared/log/LoggableType";
// import { LogValueSetNumberArray, LogValueSetRaw } from "../../shared/log/LogValueSets";
import TabType from "../../shared/TabType";
import PointCloudVisualizerSwitching from "../../shared/visualizers/PointCloudVisualizerSwitching";
import TimelineVizController from "./TimelineVizController";

export default class PointCloudController extends TimelineVizController {

  private UI_DTYPE: HTMLSelectElement;
  private UI_DTYPE_SIGNED_SPAN: HTMLSpanElement;
  private UI_DTYPE_SIGNED: HTMLInputElement;
  private UI_POINT_ELEMS: HTMLInputElement;
  private UI_USE_COLORS: HTMLInputElement;
  private UI_STATIC_COLOR: HTMLInputElement;
  private UI_COLOR_RESET: HTMLButtonElement;
  private UI_POINT_SIZE: HTMLInputElement;

  constructor(content: HTMLElement) {
    let configBody = content.getElementsByClassName("timeline-viz-config")[0].firstElementChild as HTMLElement;
    super(
      content,
      TabType.PointClouds,
      [
        {
          element: configBody.children[1].firstElementChild as HTMLElement,
          types: [ LoggableType.Raw, LoggableType.NumberArray ]
        }
      ],
      [ // use this array if we want to support multiple point clouds rendering at once (ie. different colors!?)
        // {
        //   element: configBody.children[1].children[0] as HTMLElement,
        //   types: [
        //     LoggableType.Raw,
        //     LoggableType.NumberArray,
        //     "Translation3d[]"
        //   ],
        //   options: [
        //     ["Point Cloud 1"]
        //   ]
        // }
      ],
      new PointCloudVisualizerSwitching(
        content,
        content.getElementsByClassName("point-clouds-canvas")[0] as HTMLCanvasElement,
        content.getElementsByClassName("point-clouds-annotations")[0] as HTMLElement,
        content.getElementsByClassName("point-clouds-alert")[0] as HTMLElement
      )
    );

    const UI_ROW_1 = configBody.children[1];
    const UI_ROW_2 = configBody.children[2];
    const UI_ROW_3 = configBody.children[3];
    const UI_C1A = UI_ROW_1.children[1];
    const UI_C1B = UI_ROW_2.children[0];
    const UI_C2A = UI_ROW_1.children[2];
    const UI_C2B = UI_ROW_2.children[1];
    const UI_C2C = UI_ROW_3.children[1];    // this crap is so confusing :|

    this.UI_DTYPE = UI_C1A.children[1] as HTMLSelectElement;
    this.UI_DTYPE_SIGNED_SPAN = UI_C1A.children[2] as HTMLSpanElement;
    this.UI_DTYPE_SIGNED = UI_C1A.children[3] as HTMLInputElement;
    this.UI_POINT_ELEMS = UI_C1B.children[1] as HTMLInputElement;
    this.UI_USE_COLORS = UI_C2A.children[1] as HTMLInputElement;
    this.UI_STATIC_COLOR = UI_C2B.children[1] as HTMLInputElement;
    this.UI_COLOR_RESET = UI_C2B.children[2] as HTMLButtonElement;
    this.UI_POINT_SIZE = UI_C2C.children[1] as HTMLInputElement;

    this.UI_COLOR_RESET.addEventListener("click", () => {
      this.UI_STATIC_COLOR.value = (window.matchMedia("(prefers-color-scheme: dark)").matches) ? "#ffffff" : "#222222";
    });
    this.UI_DTYPE.addEventListener("change", () => this.updateUiDependentControls());

  }

  /** update ui values that are dependant of other controls */
  private updateUiDependentControls() {
    console.log("update dependent controls: ", this.options);
    if (Array.from(this.UI_DTYPE.value)[0] == 'i') {
      this.UI_DTYPE_SIGNED_SPAN.hidden = this.UI_DTYPE_SIGNED.hidden = false;
    } else {
      this.UI_DTYPE_SIGNED_SPAN.hidden = this.UI_DTYPE_SIGNED.hidden = true;
    }
  }


  /** Switches the orbit FOV for the main visualizer. */
  setFov(fov: number) {
    (this.visualizer as PointCloudVisualizerSwitching).setFov(fov);
  }


/** Overrides for TimelineVizController */

  get options(): { [id: string]: any } {
    return {
      dtype: this.UI_DTYPE.value,
      dtype_signed: this.UI_DTYPE_SIGNED.checked,
      point_elems: this.UI_POINT_ELEMS.value,
      use_point_colors: this.UI_USE_COLORS.checked,
      static_color: this.UI_STATIC_COLOR.value,
      point_size: this.UI_POINT_SIZE.value,
    };
  }

  set options(options: { [id: string]: any }) {
    if(options.dtype) this.UI_DTYPE.value = options.dtype;
    if(options.dtype_signed) this.UI_DTYPE_SIGNED.checked = options.dtype_signed;
    if(options.point_elems) this.UI_POINT_ELEMS.value = options.point_elems;
    if(options.use_point_colors) this.UI_USE_COLORS.checked = options.use_point_colors;
    if(options.static_color) this.UI_STATIC_COLOR.value = options.static_color;
    if(options.point_size) this.UI_POINT_SIZE.value = options.point_size;
    this.updateUiDependentControls();
  }

  newAssets() {}  // shouldn't need to do anything with this
  getAdditionalActiveFields(): string[] { return []; }    // shouldn't need this for anything either

  /** This gets called every 'control loop' (15hz?) with the currently selected timestamp in the viewer */
  getCommand(time: number) {

    const fields_arr = super.getFields();

    if (fields_arr.length > 0 && fields_arr[0]) {  // only use the first cloud for now
      const field = fields_arr[0];    // currently only 1 point cloud slot so use the first idx

      switch (field.sourceType) {

        case LoggableType.Raw: {
          const valset = window.log.getRaw(field.key, time, time);
          const arr = valset?.values[0];    // the "range" is only a single timestamp so we only ever should have a single value
          
          const BYTES_PER_ELEM : number = 16;
          if (arr?.buffer !== undefined) {
            const trimmed_length = arr.length - (arr.length % BYTES_PER_ELEM);  // arr is Uint8Array so length is number of bytes
            return {

              //parse x and y
              x: new Uint8Array( (arr.byteOffset == 0 ? arr.buffer : arr.buffer.slice(arr.byteOffset)), 0, trimmed_length )[0],
              y: new Uint8Array( (arr.byteOffset == 0 ? arr.buffer : arr.buffer.slice(arr.byteOffset)), 0, trimmed_length )[1], 
              buffer: new Uint8Array( (arr.byteOffset == 0 ? arr.buffer : arr.buffer.slice(arr.byteOffset)), 0, trimmed_length ).slice(2),
              src_ts: valset?.timestamps[0],
              ui_options: this.options
            };
          }

          break;

        }

        // case LoggableType.NumberArray: {
        //   const valset = window.log.getNumberArray(field.key, time, time);    // same here
        //   const arr = valset?.values[0];
        //   // console.log('point data timeline scroll: received number array of length %d', arr?.length);

        //   return {
        //     buffer: (arr !== undefined) ? new Float32Array(arr.slice(0, arr.length - (arr.length % 4))) : null,
        //     src_ts: valset?.timestamps[0]
        //   };

        // }

      }

    }

    // default object with null buffer
    return {
      buffer: null,
      src_ts: undefined,
      ui_options: this.options
    };

  }


}
