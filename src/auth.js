import { User } from './Model/User.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export const auth = async(req, res, next) => {
  try {
    const user = req.method == "POST" && req.body.login == 1 ? await Auth.login(req) : await Auth.user(req);
    if(user) req.user = user;
    return next();
  } catch(e) {
    req.session.error = e;
    res.redirect('/auth');
  }
};

class Auth
{
  static async user(req){
    let expired;
    let user;
    user = req.session.userId ? await User.where({ _id: req.session.userId }).first() : false;
    if(!user) throw('default');

    //Coming soon
    // if(req.cookies.remember_token && Token.compare(req.cookies.remember_token, user.remember_token)){
    //   expired = Token.refresh(req.cookies.remember_token);
    // } else expired = true;
    // if(expired) throw('Your token has expired');

    return user;
  }

  static async login(req){
    const username = req.body.username;
    const password = req.body.password;
    /*Need more validation*/
    if(!username) throw('Bad username');
    if(password.length < 6) throw('Password must be at least 6 characters');
    /**/

    // const hash = Encryption.hash(password);
    //Change password
    // User.where({ username: username }).update({ password: hash });

    //Create new user
    // User.create({ name: "Admin", username: username, email: "ershoff.antoha@yandex.com", created_at: Date.now(), updated_at: Date.now(), password: hash });

    const user = await User.where({ username: username }).first();
    if(!user || !Encryption.compare(password, user.password)) throw('Invalid username or password');
    req.session.userId = user._id.valueOf();

    return user;
  }

  logout(req, res){
    req.session.userId = undefined;
    res.redirect('/auth');
  }
}

class Encryption
{
  static hash(secret){
    return bcrypt.hashSync(secret, 12);
  }

  static compare(string, hash){
    return bcrypt.compareSync(string, hash);
  }
}

// COMING SOON
// class Token
// {
//   static async refresh(user_id){
//     const date = new Date().getTime();
//     const lifetime = 24 * 60 * 1000;
//
//     const user = await User.where({ _id: user_id}).first();
//     const token = user.remember_token ? Encryption.hash(user.remember_token + date) : Encryption.hash(user._id.valueOf() + date);
//
//     bcrypt.hash(token, 12, function(err, hash) {
//       User.where({ _id: user_id}).update({ remember_token: hash, updated_at: date });
//     });
//   }
// }
