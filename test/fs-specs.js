import { fs, tempDir } from '../index.js';
import chai from 'chai';
import path from 'path';
import { exec } from 'teen_process';


let should = chai.should();

describe('fs', function () {
  const existingPath = path.resolve(__dirname, 'fs-specs.js');
  it("should exist", function () {
    should.exist(fs);
  });
  it("should have expected methods", function () {
    should.exist(fs.open);
    should.exist(fs.close);
    should.exist(fs.access);
    should.exist(fs.mkdir);
    should.exist(fs.readlink);
    should.exist(fs.exists);
    should.exist(fs.rimraf);
    should.exist(fs.readFile);
    should.exist(fs.writeFile);
    should.exist(fs.lstat);
    should.exist(fs.mv);
  });

  describe("mkdir", function () {
    let dirName = path.resolve(__dirname, "tmp");

    it("should make a directory that doesn't exist", async function () {
      await fs.rimraf(dirName);
      await fs.mkdir(dirName);
      let exists = await fs.hasAccess(dirName);
      exists.should.be.true;
    });

    it("should not complain if the dir already exists", async function () {
      let exists = await fs.hasAccess(dirName);
      exists.should.be.true;
      await fs.mkdir(dirName);
    });

    it("should still throw an error if something else goes wrong", async function () {
      await fs.mkdir("/bin/foo").should.be.rejected;
    });
  });

  it('hasAccess', async function () {
    (await fs.exists(existingPath)).should.be.ok;
    let nonExistingPath = path.resolve(__dirname, 'wrong-specs.js');
    (await fs.hasAccess(nonExistingPath)).should.not.be.ok;
  });
  it('exists', async function () {
    (await fs.exists(existingPath)).should.be.ok;
    let nonExistingPath = path.resolve(__dirname, 'wrong-specs.js');
    (await fs.exists(nonExistingPath)).should.not.be.ok;
  });
  it('readFile', async function () {
    (await fs.readFile(existingPath, 'utf8')).should.contain('readFile');
  });
  it('copyFile', async function () {
    let newPath = path.resolve('/tmp', 'fs-specs.js');
    await fs.copyFile(existingPath, newPath);
    (await fs.readFile(newPath, 'utf8')).should.contain('readFile');
  });
  it('rimraf', async function () {
    let newPath = path.resolve('/tmp', 'fs-specs.js');
    (await fs.exists(newPath)).should.be.true;
    await fs.rimraf(newPath);
    (await fs.exists(newPath)).should.be.false;
  });
  describe('md5', function () {
    this.timeout(1200000);
    let smallFilePath;
    let bigFilePath;
    before(async function () {
      // get the path of a small file (this source file)
      smallFilePath = existingPath;

      // create a large file to test, about 163840000 bytes
      bigFilePath = path.resolve(await tempDir.openDir(), 'enormous.txt');
      let file = await fs.open(bigFilePath, 'w');
      let fileData = '';
      for (let i = 0; i < 4096; i++) {
        fileData += '1';
      }
      for (let i = 0; i < 40000; i++) {
        await fs.write(file, fileData);
      }
      await fs.close(file);
    });
    after(async function () {
      await fs.unlink(bigFilePath);
    });
    it('should calculate hash of correct length', async function () {
      (await fs.md5(smallFilePath)).should.have.length(32);
    });
    it('should be able to run on huge file', async function () {
      (await fs.md5(bigFilePath)).should.have.length(32);
    });
  });
  it('stat', async function () {
    let stat = await fs.stat(existingPath);
    stat.should.have.property('atime');
  });
  describe('which', function () {
    it('should find correct executable', async function () {
      let systemNpmPath = (await exec('which', ['npm'])).stdout.trim();
      let npmPath = await fs.which('npm');
      npmPath.should.equal(systemNpmPath);
    });
    it('should fail gracefully', async function () {
      await fs.which('something_that_does_not_exist')
        .should.eventually.be.rejected;
    });
  });
  it('glob', async function () {
    let glob = 'test/*-specs.js';
    let tests = await fs.glob(glob);
    tests.should.be.an('array');
    tests.should.have.length.above(2);
  });
});