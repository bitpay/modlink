#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var NODE_MODULES = 'node_modules';

var targetDir = './'+NODE_MODULES+'@';
if(!isDirectory('./node_modules')) process.exit(0);

// first, we need to ensure that all module dependencies
// exist as directory entries with each package's node_modules
// directory...create links where the dependency is not
// already included
linkModules('.', []);

// next, move a relink all dependencies to version specific
// directories within node_modules@
createDir(targetDir);
moveModules('.', targetDir);

// push module links down the module hierarchy ensure all
// visible modules are captured when moved to the module
// versions directory
function linkModules(path, itemStack) {
  var nodeModulesDir = path + '/' + NODE_MODULES;
  var pkg = getPackage(path);
  if(!pkg) return;
  var modules = getModules(nodeModulesDir);;

  // for each sub-module, get a list of the modules at this
  // level and recursively descend to create the links
  for(var i=0; i<modules.length; i++) {
    itemStack.push(modules.slice());
    linkModules(nodeModulesDir+'/'+modules[i], itemStack);
    itemStack.pop();
  }

  // create the links at this level for all modules above us
  // that appear in the package.json dependencies, but don't
  // already exist
  var prefix = '../..';
  for(var i=itemStack.length - 1; i>=0; i--) {
    var items = itemStack[i];
    for(var j=0; j<items.length; j++) {
      if(!exists(nodeModulesDir+'/'+items[j]) &&isADependency(pkg, items[j])) {
        ensure(nodeModulesDir);
        fs.symlinkSync(prefix+'/'+items[j], nodeModulesDir+'/'+items[j]);
      }
    }
    prefix += '/../..';
  }
};

// find things in the given directory (usually a node_modules
// directory) that look like a nodejs module and return that list
function getModules(dir) {
  var files = [];
  try {
    files = fs.readdirSync(dir);
  } catch(e) {
    if(e.code != 'ENOENT') throw e;
  }

  return files.filter(function(file) {
    return readVersion(dir+'/'+file);
  });
};

function getModuleVersions(dir) {
  var files = [];
  try {
    files = fs.readdirSync(dir);
  } catch(e) {
    if(e.code != 'ENOENT') throw e;
  }
  var modules = [];
  for(var i=0; i<files.length; i++) {
    var file = files[i];
    var module = {
      name: file,
      version: readVersionEvenIfPreLinked(dir+'/'+file),
      isLink: isSymlink(dir+'/'+file)
    };
    if(module.version) modules.push(module);
  }
  return modules;
};

// ensure the given directory exists
function ensure(dir) {
  if(exists(dir)) return;
  fs.mkdirSync(dir);
};

// check whether the given module name is a dependency
// of the given package.json object
function isADependency(pkg, item) {
  if(pkg.dependencies) {
    var deps = Object.keys(pkg.dependencies);
    if(deps.indexOf(item) > -1) return true;
  }
  if(pkg.devDependencies) {
    var devDeps = Object.keys(pkg.devDependencies);
    if(devDeps.indexOf(item) > -1) return true;
  }
  return false;
};

function moveModules(dir, targetDir, linkPrefix) {
  var nodeModulesDir = dir + '/' + NODE_MODULES;
  var modules = getModuleVersions(nodeModulesDir);
  if(!linkPrefix) linkPrefix = path.relative(nodeModulesDir, targetDir);
  modules.forEach(function(module) {
    var versionedName = module.name+'@'+module.version;
    var srcPath = nodeModulesDir+'/'+module.name;
    var targetPath = targetDir+'/'+versionedName;
    var linkTarget = linkPrefix+'/'+versionedName;
    if(module.isLink) {
      fs.unlinkSync(srcPath);
    } else {
      moveModules(srcPath, targetDir, '../..');
      if(exists(targetPath)) {
        ensureAllSubmodulesPresent(srcPath, targetPath);
        warnIfModulesDontMatch(srcPath, targetPath);
        rmdirfrSync(srcPath);
      } else {
        fs.renameSync(srcPath, targetPath);
      }
    }
    fs.symlinkSync(linkTarget, srcPath);
  });
};

function ensureAllSubmodulesPresent(srcDir, targetDir) {
  // read the links names in the srcDir and make sure
  // they all exist in the targetDir, all submodules in 
  // srcDir should already be links to version specific
  // modules, so we just need to copy the ones that don't 
  // exist in the target
  var srcModDir = srcDir+'/'+NODE_MODULES;
  if(!exists(srcModDir)) return;
  var targetModDir = targetDir+'/'+NODE_MODULES;
  var files = fs.readdirSync(srcModDir);
  for(var i=0; i<files.length; i++) {
    var srcMod = srcModDir+'/'+files[i];
    var targetMod = targetModDir+'/'+files[i];
    if(isSymlink(srcMod)) {
      if(!exists(targetMod) && !isSymlink(targetMod)) {
        var linkTarget = fs.readlinkSync(srcMod);
        ensure(targetModDir);
        fs.symlinkSync(linkTarget, targetMod);
      }
    }
  }
};

function warnIfModulesDontMatch(srcDir, targetDir) {
  // now move this module, if module is already in the
  // target directory, check:
  // - shasum of module (without node_modules) is the same
  // - all sub-modules exists (add any that are missing)
  // - all sub-module versions match (will need to examine the link target names)
  checkShasum(srcDir, targetDir);
};


function createLinks(dir, targetDir) {
  var files = fs.readdirSync(dir);
  var linkPrefix = path.relative(dir, targetDir);
  for(var i=0; i<files.length; i++) {
    var fname = dir+'/'+files[i];
    var version = readVersion(fname);
    if(version && !isSymlink(fname)) {
      var target = targetDir+'/'+files[i]+'@'+version;
      var linkTarget = linkPrefix+'/'+files[i]+'@'+version;
      if(exists(target)) {
        checkShasum(fname, target);
        rmdirfrSync(fname);
      } else {
        fs.renameSync(fname, target);
      }
      fs.symlinkSync(linkTarget, fname);
    }
  }
};

// compare the given directories to ensure their
// shasums match, excluding their node_modules 
// subdirectory, if they don't, output a warning
function checkShasum(dir1, dir2) {
  //todo 
};

function readVersion(dir) {
  var pkg = getPackage(dir);
  if(!pkg) return undefined;
  return pkg.version;
};

// it's possible that we are trying to read a version from linked
// module in a parent directory that has already been moved leaving
// an as yet invalid symlink in its place...since the symlink target
// will have the module version in it's name, we can get the version
// from that symlink's target
function readVersionEvenIfPreLinked(dir) {
  var version = readVersion(dir);
  if(version) return version;
  if(!isSymlink(dir)) return undefined;
  var link = dir;
  while(isSymlink(link)) {
    link = path.resolve(path.dirname(link), fs.readlinkSync(link));
  }
  var tmp = path.basename(link).split('@');
  if(!tmp) return undefined;
  if(tmp.length == 2) return tmp[1];
  return undefined;
};

function getPackage(dir) {
  try {
    return JSON.parse(fs.readFileSync(dir+'/package.json'));
  } catch(e) {
    return undefined;
  }
};

function createDir(dir) {
  try {
    var stat = fs.statSync(dir);
    if(!stat.isDirectory()) throw new Error('failed to create directory: '+dir);
  } catch(e) {
    if(e.code == 'ENOENT') {
      fs.mkdirSync(dir);
    } else {
      throw e;
    }
  }
};

function exists(path) {
  try {
    var stat = fs.statSync(path);
    return true;
  } catch(e) {
    return false;
  }
};

function isDirectory(fname) {
  try {
    var stat = fs.statSync(fname);
    return stat.isDirectory();
  } catch(e) {
    return false;
  }
};

function isSymlink(fname) {
  try {
    var stat = fs.lstatSync(fname);
    return stat.isSymbolicLink();
  } catch(e) {
    return false;
  }
};

function rmdirfrSync(path) {
  if(exists(path)) {
    fs.readdirSync(path).forEach(function(file,index) {
      var curPath = path + "/" + file;
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        rmdirfrSync(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};
