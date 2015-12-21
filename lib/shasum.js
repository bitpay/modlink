var crypto = require('crypto');
var fs = require('fs');
var async = require('async');

function shasum(path, filter, callback) {
  if(!callback) {
    callback = filter;
    filter = undefined;
  }
  hashPath(path, callback);

  function hashPath(path, callback) {
    if(filter && !filter(path)) return callback(null, undefined);
    fs.lstat(path, function(err, stats) {
      if(err) return callback(err);
      if(stats.isDirectory()) return hashDirectory(path, callback);
      if(stats.isSymbolicLink()) return hashSymbolicLink(path, callback);
      hashFile(path, callback);
    });
  };

  function hashDirectory(path, callback) {
    fs.readdir(path, function(err, files) {
      if(err) return callback(err);
      var answer = '';
      async.eachSeries(files, function(file, done) {
        hashPath(path+'/'+file, function(err, hash) {
          if(hash) answer += file+':'+hash+'\n';
          done(err);
        });
      }, function(err) {
        callback(err, hashString(answer));
      });
    });
  };

  function hashSymbolicLink(path, callback) {
    fs.readlink(path, function(err, linkTarget) {
      if(err) return callback(err);
      callback(err, hashString(linkTarget));
    });
  };

  function hashFile(path, callback) {
    var error = undefined;
    var hash = crypto.createHash('sha256');
    var strm = fs.ReadStream(path);
    strm.on('data', function(data) {
      hash.update(data);
    });
    strm.on('error', function(err) {
      error = err;
    });
    strm.on('close', function() {
      if(error) return callback(error);
      var answer = hash.digest('hex');
      callback(null, answer);
    });
  };

  function hashString(aString) {
    var hash = crypto.createHash('sha256');
    hash.update(aString);
    return hash.digest('hex');
  };
};

module.exports = shasum;
