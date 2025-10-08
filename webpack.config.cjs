const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    entry: path.join(__dirname, 'src/index.tsx'),
    output: {
        path: path.join(__dirname, 'dist/'),
        filename: 'index.js',
        library: {
            type: 'module'
        }
    },
    experiments: {
        outputModule: true
    },
    externalsType: 'module',
    externals: [
        function ({ context, request }, callback) {
            // Externalize deep relative paths that are NOT targeting node_modules.
            // This correctly identifies SillyTavern's runtime scripts.
            if (request.startsWith('../../..') && !request.includes('node_modules')) {
                const isFromMySrc = context && !context.includes('node_modules');
                const isFromUtilsLib = context && context.includes('sillytavern-utils-lib');

                if (isFromMySrc || isFromUtilsLib) {
                    return callback(null, `module ${request}`);
                }
            }

            // Continue without externalizing the import
            callback();
        },
    ],
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'style.css',
        }),
    ],
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
        extensionAlias: {
            '.js': ['.ts', '.js', '.tsx', '.jsx'],
            '.cjs': ['.cts', '.cjs', '.tsx', '.jsx'],
            '.mjs': ['.mts', '.mjs', '.tsx', '.jsx'],
        }
    },
    devtool: process.env.NODE_ENV === 'production' ? false : 'source-map',
    module: {
        rules: [
            {
                test: /\.(ts|tsx|js|jsx)$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            cacheDirectory: true,
                            presets: [
                                '@babel/preset-env',
                                ['@babel/preset-react', { runtime: 'automatic' }],
                                '@babel/preset-typescript',
                            ],
                        },
                    },
                    {
                        loader: 'ts-loader',
                        options: {
                            transpileOnly: process.env.NODE_ENV !== 'production',
                        },
                    },
                ],
            },
            {
                test: /\.(s[ac]ss|css)$/i,
                use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
            },
        ],
    },
    optimization: {
        minimize: process.env.NODE_ENV === 'production',
        minimizer: [new TerserPlugin({
            extractComments: false,
        })],
    },
}
