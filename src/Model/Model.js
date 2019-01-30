import { Database } from '../database';
import { ObjectId } from 'mongodb';

export class Model
{
  constructor(obj, method){
    this.collectionName = this.constructor.name.toLowerCase() + 's';
    this.driver = Database.driver().toLowerCase();

    this.criteria = {};
    this.sort = {};

    if(obj){
      Object.keys(obj).forEach((key) => {
        this[key] = obj[key];
      });
    }
  }

  static where(criteria){
    const driver = Database.driver().toLowerCase();
    let result;

    switch (driver) {
      case 'mongodb':
        {
        /*Need verification*/
        if(criteria._id) criteria._id = new ObjectId(criteria._id);
        result = {criteria: criteria};
        /**/
        break;
        }
      default:
        return false;
    }
    return new this(result);
  }

  orderBy(fields){
    const driver = Database.driver().toLowerCase();
    let result;

    if(fields){
      switch (driver) {
        //Not working
        case 'mongodb':
        {
          /*Need verification*/
          if (!fields || typeof fields != 'object') return console.log("Error. Need object { fieldName: 'ASC || DESC' }");
          Object.keys(fields).forEach((key) => {
            if(fields[key] != 'ASC' && fields[key] != 'DESC') return console.log("Set orderBy ASC or DESC");
            this.sort[key] = fields[key] == 'ASC' ? 1 : -1;
          });
          /**/
          break;
        }
        default:
        return false;
      }
    }

    return result;
  }

  static limit(limit){
    return 'Method in development';
  }

  // CRUD
  //Create
  static async create(obj){
    const driver = Database.driver().toLowerCase();
    let result;

    switch (driver) {
      case 'mongodb':
        {
        /*Need verification*/
        result = obj;
        /**/
        break;
        }
      default:
        return false;
    }
    const model = new this(result);
    await model.create(obj);
    return model;
  }

  async create(obj){
    let result;
    switch (this.driver) {
      case 'mongodb':
        {
        /*Need verification*/
        result = await Database.db.collection(this.collectionName).insertOne(obj);
        /**/
        break;
        }
      default:
        return false;
    }
    let resArr = [];
    !Array.isArray(obj) ? resArr.push(obj) : resArr = obj;
    this.prepare(resArr);
  }

  //Read
  static async all(){
    const model = new this();
    await model.all();
    return model;
  }

  async all(){
    let result;

    switch (this.driver) {
      case 'mongodb':
        {
        result = await Database.db.collection(this.collectionName).find().sort({id: -1}).toArray();
        break;
        }
      default:
        result = false;
    }
    this.prepare(result);
    return this;
  }

  async get(){
    let result;

    switch (this.driver) {
      case 'mongodb':
        {
        /*Need verification*/
        const criteria = this.criteria;
        /**/
        result = await Database.db.collection(this.collectionName).find(criteria).sort(this.sort).toArray();
        break;
        }
      default:
        result = false;
    }
    this.prepare(result);
    return this;
  }

  static async last(){
    const driver = Database.driver().toLowerCase();
    let result;

    switch (driver) {
      case 'mongodb':
        {
        /*Need verification*/
        result = {sort: {$natural:-1}};
        /**/
        break;
        }
      default:
        return false;
    }
    const model = new this(result);
    await model.first();
    return model;
  }

  static async first(){
    const driver = Database.driver().toLowerCase();
    let result;

    switch (driver) {
      case 'mongodb':
        {
        /*Need verification*/
        result = {};
        /**/
        break;
        }
      default:
        return false;
    }
    const model = new this(result);
    return model.first();
    // return model;
  }

  async first(){
    let result;

    switch (this.driver) {
      case 'mongodb':
        {
        /*Need verification*/
        const criteria = this.criteria;
        /**/
        result = await Database.db.collection(this.collectionName).find(criteria).limit(1).sort(this.sort).toArray();
        break;
        }
      default:
        result = false;
    }
    return this.prepare(result, true) ? this : null;
  }

  value(){
    return 'Method in development';
  }

  //Update
  async update(fields){
    let result;

    switch (this.driver) {
      case 'mongodb':
        {
        /*Need verification*/
        const criteria = this.criteria;
        const values = { $set: fields };
        /**/
        await Database.db.collection(this.collectionName).updateMany(criteria, values);
        break;
        }
      default:
        throw new Error('Need to set the driver');
    }
  }

  //Delete
  delete(){
    return 'Method in development';
  }

  prepare(obj, one = false){
    if(one == true && (Array.isArray(obj) && obj.length > 0)){
      obj = obj[0];
    } else {
      this.collection = [];
    }
    this.criteria = undefined;
    this.sort = undefined;
    let status = false;
    Object.keys(obj).forEach((key) => {
      if(one == true){
        this[key] = obj[key];
        status = true;
      } else {
        this.collection.push(obj[key]);
        status = true;
      }
    });
    return status;
  }
}
