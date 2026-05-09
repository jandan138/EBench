# OpenPI Baseline Evaluation Guide

This guide describes the minimal workflow for evaluating the post-trained OpenPI baseline, including $\pi_{0.5}$ and $\pi_{0}$, on EBench.

## Setup

### 1. Install OpenPI

Install the official OpenPI repository located at:

```bash
baselines/openpi/third_party/openpi
```

Please refer to the official OpenPI README for detailed setup instructions.

### 2. Add EBench-Specific Files

The EBench-specific files are provided under:

```bash
baselines/openpi/src/
baselines/openpi/scripts/
```

Layer these files on top of the official OpenPI codebase. This can be done by either updating `PYTHONPATH` or copying the files to the corresponding locations in the OpenPI repository.

### 3. Configure Evaluation Settings

Before running evaluation, modify the configuration file:

```bash
scripts/launch_pi_onlineeval.sh
```

Please make sure that the model path, dataset path, environment settings, and output directory are correctly specified.

### 4. Download EBench Post-Trained Models

The post-trained OpenPI models on EBench are available at:

- [$\pi_{0.5}$ EBench Generalist](https://huggingface.co/william-g/pi05-ebench-generalist/tree/main)
- [$\pi_{0}$ EBench Generalist](https://huggingface.co/william-g/pi0-ebench-generalist/tree/main)

Download the desired checkpoint and update the model path in:

```bash
scripts/launch_pi_onlineeval.sh
```

## Run Evaluation

Launch the evaluation with:

```bash
bash scripts/launch_pi_onlineeval.sh
```