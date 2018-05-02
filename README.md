# Static

## Dependencies

- [Node 8.9.4](http://nodejs.org/)
- [Yarn](https://yarnpkg.com/en/)

## Setup

1. Install dev dependencies via `yarn`;
2. Copy `.env.example` to `.env` and set appropriate credentials

## Development

Start up your dev environment with the following two commands:

```
$ yarn start
```

## Deployment

Deploy the `build` and `public` directories to S3. We recommend cleaning directories and AWS cache before you do:

```
$ yarn clean
$ yarn build
$ yarn deploy
```

## Commands

```js
$ yarn clean // Cleans up build directories
$ yarn start // Watches development assets
$ yarn build // Builds production ready assets
$ yarn deploy // Sends files off to an S3 bucket
```