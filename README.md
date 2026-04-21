# EBench

**Elemental Mobile Manipulation Benchmark**.

## Overview

EBench is a mobile manipulation benchmark suite for providing elemental analysis of embodied foundation models's generalization ability. 

## Repository layout

```
EBench/
├── baselines/   # Reference policies and baseline implementations
|    ├────── <name>/  # Baseline directory
├── scripts/     # Training, evaluation, and data-generation scripts
|    ├────── eval.py  # Evaluation script
|    ├────── utils.py # Utility functions for result analysis
├── LICENSE
└── README.md
```

## Getting started

> Setup instructions will be added once the environment dependencies are finalized.

```bash
git clone <repo-url>
cd EBench
# pip install -r requirements.txt   # TODO
```

## Running a baseline

```bash
# TODO: example command, e.g.
# python scripts/eval.py --baseline <name> --task <task-id>
```

## Tasks

A complete task list will be documented here. Each task ships with:

- a scene / asset specification,
- a success criterion,
- a reference baseline result.

## Citation

If you use EBench in your research, please cite:

```bibtex

```


## License

Released under the [MIT License](LICENSE).
