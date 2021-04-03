import path from 'path';
import webpack, { OutputFileSystem } from 'webpack';

import { createFsFromVolume, Volume } from 'memfs';
import { LoaderOptions } from "../LoaderOptions";

export default (fixture: string, options: LoaderOptions): Promise<[webpack.Stats, webpack.Compiler]> => {
    const compiler: webpack.Compiler = webpack({
        context: __dirname,
        entry: path.resolve(__dirname, `../../fixtures/${fixture}`),
        output: {
            path: path.resolve(__dirname),
            filename: 'bundle.js',
        },
        resolve: {
            extensions: ['.gql'],
            alias: {
                'gql-webpack-loader' : path.resolve(__dirname, '../../index.d.ts')
            }
        },
        module: {
            rules: [
                {
                    test: /\.gql$/,
                    use: [{
                        loader: path.resolve(__dirname, '../../index.js'),
                        options
                    }]
                }
            ],
        }
    });
    const webpackFs = createFsFromVolume(new Volume())
    compiler.outputFileSystem = webpackFs as unknown as OutputFileSystem;
    compiler.outputFileSystem.join = path.join.bind(path);
    (compiler as any).webpack.ModuleFilenameHelpers.matchObject = () => false

    return new Promise((resolve, reject) => {
        compiler.run((err, stats) => {
            if (err) reject(err);
            if (stats.hasErrors()) reject(stats.toJson().errors);
            resolve([stats, compiler]);
        });
    });
};
