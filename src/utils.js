export const asyncHandler = fn => function asyncUtilWrap(req, res, next, ...args) {
  const fnReturn = fn(req, res, next, ...args);
  return Promise.resolve(fnReturn).catch(next);
};

export const asyncWait = (ms) => {
  return new Promise((ok, fail) => setTimeout(ok, ms));
};

export const compareObjects = (obj1, obj2) => {
  if (Object.keys(obj1).length != Object.keys(obj2).length) return false;
  const keys = Object.keys(obj1);

  for(let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (obj1[key] !== obj2[key]) {
      return false;
    }
  }

  return true;
};
