import { platform } from 'os';
import { readJsonSync } from 'fs-extra';
import { resolve } from 'path';
import { execSync, type ExecSyncOptions } from 'child_process';

const _platform = platform();
export const isMac = _platform === 'darwin';
export const isWin = _platform === 'win32';

export const WX_CALENDAR_PKG_NAME = '@lspriv/wx-calendar';

export const PKG_LATEST_VERSION = 'latest';

/**
 * 如果小程序开发工具不是默认安装位置，请设置cli路径
 * CLI_PATH 未设置时将会在以下几个位置尝试寻找：
 * Mac：/Applications/wechatwebdevtools.app/Contents/MacOS/cli
 * Win：C:/Program Files (x86)/Tencent/微信web开发者工具/cli.bat
 */
const CLI_PATH = isMac 
    ? '/Applications/wechatwebdevtools.app/Contents/MacOS/cli' 
    : isWin 
        ? 'C:/Program Files (x86)/Tencent/微信web开发者工具/cli.bat' 
        : '';

export interface PkgJson {
    name: string;
    version: string;
    author: string;
    description: string;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
}

export const getPrjConfig = (): Record<string, any> => {
    return readJsonSync(resolve(process.cwd(), 'project.config.json'), 'utf8');
};

export const getPkgConfig = (): PkgJson => {
    return readJsonSync(resolve(process.cwd(), 'package.json'), 'utf8');
};

const PRJ_PATH = resolve(process.cwd(), getPrjConfig()?.miniprogramRoot as string || 'dist');

export interface CliOptions extends ExecSyncOptions {
  cli?: string;
  withPrj?: boolean;
}

export const createCli = (prjPath?: string) => (command, options?: CliOptions) => {
    let { cli, withPrj, ...rest } = options || {};
    const opts: ExecSyncOptions = { ...rest, encoding: 'utf-8' };
    const cliPath = cli || CLI_PATH;
    const result = execSync(`${cliPath} ${command}${withPrj ? ` --project ${prjPath || PRJ_PATH}` : ''}`, opts);
    return typeof result === 'string' ? JSON.parse(result) : result;
};

export const formatJson = (json: Record<string, any>) => {
    return JSON.stringify(json, null, 2);
}

const mergeCommand = (command: string, pkg?: string, args?: string[]) => {
    return [command, pkg, ...(args || [])].filter(item => !!item).join(' ');
}

const pnpmInstall = (path: string, pkg?: string, args?: string[]) => {
    execSync(mergeCommand('pnpm install', pkg, args), { cwd: path, stdio: 'ignore' });
};

const npmInstall = (path: string, pkg?: string, args?: string[]) => {
    execSync(mergeCommand('npm install', pkg, args), { cwd: path, stdio: 'ignore' });
};

const cnpmInstall = (path: string, pkg?: string, args?: string[]) => {
    execSync(mergeCommand('cnpm install', pkg, args), { cwd: path, stdio: 'ignore' });
};

export const PKG_INSTALLER = {
    cnpm: cnpmInstall,
    pnpm: pnpmInstall,
    npm: npmInstall
} as const;

export const getDefaultPmInstaller = (): typeof PKG_INSTALLER[keyof typeof PKG_INSTALLER] => {
    try {
        execSync('cnpm --version', { stdio: 'ignore' });
        return cnpmInstall;
    } catch (e) {}

    try {
        execSync('pnpm --version', { stdio: 'ignore' });
        return pnpmInstall;
    } catch (e) {}

    try {
        execSync('npm --version', { stdio: 'ignore' });
        return npmInstall;
    } catch (e) {}

    throw new Error('No package manager found');
};

export const removeComments = (content: string) => {
    return content.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');
};

export const TPL_COMP_CONTENT = `Component({})`;
export const TPL_COMP_WXML = `<view></view>`;
export const createCompJson = () => formatJson({
    component: true
});
