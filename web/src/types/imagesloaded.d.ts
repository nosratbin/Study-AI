// imagesloaded v5 ships no types; minimal declaration for the VengeanceUI staggered-grid component.
declare module "imagesloaded" {
  interface ImagesLoaded {
    on(event: "always" | "done" | "fail" | "progress", cb: (...args: unknown[]) => void): ImagesLoaded;
    off(event: string, cb: (...args: unknown[]) => void): ImagesLoaded;
  }
  function imagesLoaded(
    elem: Element | NodeList | Element[] | string,
    options?: { background?: boolean | string } | (() => void),
    callback?: () => void,
  ): ImagesLoaded;
  export default imagesLoaded;
}
