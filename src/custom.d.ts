declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  const src: string;
  export default src;
}

declare module "*.gif" {
  const src: string;
  export default src;
}

// Parcel url: prefix imports — always return the URL as a plain string
declare module "url:*.jpg" {
  const src: string;
  export default src;
}

declare module "url:*.png" {
  const src: string;
  export default src;
}

declare module "url:*.jpg" {
  const src: string;
  export default src;
}

declare module "url:*.svg" {
  const src: string;
  export default src;
}
