# AWS CDK - Setup Guide

This document provides step by step instructions to setup AWS CDK.

## Prerequisites

- Homebrew (for MacOS) or Chocolatey (for Windows)
- Node.js and npm
- AWS CDK
- Amazon Web Services account

## Setup Configuration

- Change `product: 'awscdk-example-for-aws'` to your project name in the `config/default.ts` file.
- Adjust each parameter in `config/<NODE_ENV>.ts` as per your project requirements.
- The parameters in `config/default.ts` will be overridden by those in `config/<NODE_ENV>.ts`.
- Visual Studio Code (VS Code) for code editing ([Download Here](https://code.visualstudio.com/download)).
- ESLint and Prettier plugins for VS Code for better coding practices.

## Installation

### Step 1: Install AWS CDK

AWS CDK is required. For MacOS, you can install it via Homebrew. For Windows, you can use Chocolatey.

- MacOS:

  ```bash
  brew install aws-cdk
  ```

- Windows:

  ```powershell
  choco install aws-cdk
  ```

### Step 2: Set AWS Environment Variables

Please replace `<Your AWS Profile>` and `<Your Node.js environment>` with your actual AWS Profile and Node.js environment respectively. set the following environment variables:

- MacOS:

  ```bash
  export AWS_PROFILE=<Your AWS Profile>
  export NODE_ENV=<Your Node.js environment>
  ```

- Windows:

  ```powershell
  $env:AWS_PROFILE="<Your AWS Profile>"
  $env:NODE_ENV="<Your Node.js environment>"
  ```

### Step 3: Install npm Packages

Navigate to your working directory and install the required npm packages:

```bash
npm install
```

### Step 4: Compile TypeScript Code

To compile your TypeScript code into JavaScript, use:

```bash
npm run build
```

### Step 5: Diff Your Deployment

To see the differences between your current state and the changes the AWS CDK is going to deploy, use:

```bash
cdk diff
```

### Step 7: Deploy Your Infrastructure

To deploy your infrastructure, use the following command:

```bash
cdk deploy
```

### Step 8: Destroy Your Infrastructure

To destroy your infrastructure, use the following command:

```bash
cdk destroy
```

It removes all the resources provisioned by your AWS CDK configuration. Be careful when using this command, as it will permanently destroy all your resources.

That's it. You've now deployed your infrastructure on AWS using AWS CDK!
