#! /usr/bin/env node

const fsx = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');
const readline = require('readline');

async function start() {
  inquirer.registerPrompt('directory', require('inquirer-select-directory'));
  let filesToMove = [];
  let filesNotFound = [];
  let moveFilesFlag = false;
  let deleteBackupFlag = false;
  const filesFoundBasename = [];
  const errors = [];

  const source = await inquirer
    .prompt([
      {
        type: 'directory',
        name: 'source',
        message: 'De cual carpeta quieres mover las fotos?',
        basePath: './',
      },
    ])
    .then((response, err) => response.source);

  filesToMove = await inquirer
    .prompt([
      {
        type: 'input',
        name: 'filesToMove',
        message:
          '\nIntroduce el nombre de los archivos separados por una ",":\n',
      },
    ])
    .then((answer) => {
      return answer.filesToMove.split(', ');
    });

  let filesFound = fsx.readdirSync(source);
  filesFound = filesFound.filter((file) => {
    const extension = path.extname(file);
    const basename = path.basename(file, extension);
    if (
      extension.toLowerCase() === '.cr2' ||
      extension.toLowerCase() === '.arw' ||
      extension.toLowerCase() === '.jpeg' ||
      extension.toLowerCase() === '.png'
    ) {
      filesFoundBasename.push(basename);
      return filesToMove.includes(basename);
    }
  });

  filesNotFound = filesToMove.filter((file) => {
    return !filesFoundBasename.includes(file);
  });

  moveFilesFlag = await inquirer
    .prompt([
      {
        type: 'confirm',
        name: 'moveFilesFlag',
        message:
          filesNotFound.length === 0
            ? '\nTodos los archivos fueron encontrados, desea continuar?'
            : `${filesNotFound}\nLos archivos anteriores no fueron encontrados, desea continuar? `,
      },
    ])
    .then((answer) => answer.moveFilesFlag);

  if (!moveFilesFlag) {
    process.exit();
  } else {
    let totalBytes = 0;
    let bytesTransfered = 0;
    fsx.mkdirsSync(`${source}/backup`);
    fsx.mkdirsSync(`${source}/client-selection`);
    filesFound.forEach((file) => {
      totalBytes += fsx.statSync(`${source}/${file}`).size;
    });

    filesFound.forEach((file) => {
      try {
        bytesTransfered += fsx.statSync(`${source}/${file}`).size;
        let progress = Math.floor((bytesTransfered * 100) / totalBytes);
        fsx.copySync(`${source}/${file}`, `${source}/backup/${file}`);
        process.stdout.write(
          `\r[${'.'.repeat(progress / 5)}${' '.repeat(
            20 - progress / 5
          )}] ${progress} % Backup`
        );
      } catch (error) {
        errors.push(`error triying to bakup file ${file}`);
      }
    });

    console.log('');
    bytesTransfered = 0;
    filesFound.forEach((file) => {
      try {
        bytesTransfered += fsx.statSync(`${source}/${file}`).size;
        let progress = Math.floor((bytesTransfered * 100) / totalBytes);
        fsx.renameSync(
          `${source}/${file}`,
          `${source}/client-selection/${file}`
        );
        process.stdout.write(
          `\r[${'.'.repeat(progress / 5)}${' '.repeat(
            20 - progress / 5
          )}] ${progress} % Moviendo`
        );
      } catch (error) {
        console.log(error);
        errors.push(`error moving file ${file}`);
      }
    });

    console.log('');
    deleteBackupFlag = await inquirer
      .prompt([
        {
          type: 'confirm',
          name: 'deleteBackupFlag',
          message:
            errors.length === 0
              ? '\nTodos los archivos fueron movidos con exito, eliminar copia de seguridad?'
              : `\n${errors}\nLos errores anteriores fueron encontrados, eliminar copia de seguridad? `,
        },
      ])
      .then((answer) => answer.deleteBackupFlag);

    if (!deleteBackupFlag) {
      process.exit();
    } else {
      try {
        fsx.removeSync(`${source}/backup`);
        console.log('\nCopia de seguridad eliminada');
      } catch (error) {
        console.log(error);
      }
    }

    if (errors.length > 0) {
      console.log('\n\x1b[31m', `Process end whit ${errors.length} erros`);
      errors.forEach((error) => console.log(error));
    } else {
      console.log('\n\x1b[32m', `Process end sucessfully`);
    }
    console.log('\x1b[0m\n\nPresiona cualquier tecla para salir.....');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', process.exit.bind(process, 0));
  }
}

start();
