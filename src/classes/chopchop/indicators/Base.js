export class Base {
  // Base class for indicators

  change(obj){
    if (!obj || typeof obj != 'object') return console.log("Error. Need object { property: value }");
    Object.keys(obj).forEach((key) => {
      this[key] = obj[key];
      console.log(`The ${key} for ${this.constructor.name} is successfully changed to ${obj[key]}`);
    });
  }
}
