import MongoClient from 'mongodb';
import assert from 'assert';

const dburl = "mongodb://localhost:27017";

export class Database {
  static connect() {
    return new Promise((ok, fail) => MongoClient.connect(dburl, {useNewUrlParser: true}, (err, cl) => {
      if(err) {
        fail(err);
      }
      else {
        this.db = cl.db("chopchop");
        ok();
      }
    }));
  }

  static driver(){
    return process.env.DB_DRIVER || 'default';
  }
}
