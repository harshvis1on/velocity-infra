from setuptools import setup, find_packages

setup(
    name="velocity-infra",
    version="3.0.0",
    description="Python SDK for Velocity Infra — GPU Cloud Marketplace for India. Manage instances, search offers, and deploy AI workloads.",
    long_description=open("README.md").read() if __import__("os").path.exists("README.md") else "",
    long_description_content_type="text/markdown",
    author="Velocity Infra",
    author_email="support@velocityinfra.com",
    url="https://velocity-infra.vercel.app",
    project_urls={
        "Documentation": "https://velocity-infra.vercel.app/docs",
        "Source": "https://github.com/velocity-infra/velocity-infra",
    },
    packages=find_packages(),
    install_requires=[
        "requests>=2.31.0",
        "httpx>=0.25.1",
    ],
    python_requires=">=3.8",
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: Apache Software License",
        "Programming Language :: Python :: 3",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
    ],
    keywords=["gpu", "cloud", "ai", "ml", "deep-learning", "gpu-rental", "india", "velocity-infra"],
)
