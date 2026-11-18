@module Module 1 · Neural networks in PyTorch
@lesson Tensors, autograd and gradient descent | 30
# Tensors, autograd and gradient descent

Deep learning frameworks do two jobs: fast maths on multi-dimensional arrays (**tensors**), usually on a GPU, and **automatic differentiation** so you never derive gradients by hand. We'll use **PyTorch**. Google Colab has it pre-installed and offers a free GPU (Runtime → Change runtime type → T4 GPU).

## Tensors

```python
import torch

x = torch.tensor([[1., 2.], [3., 4.]])
x.shape, x.dtype            # (torch.Size([2, 2]), torch.float32)
x @ x.T                     # matrix multiply
x.mean(dim=0)               # column means

device = "cuda" if torch.cuda.is_available() else "cpu"
x = x.to(device)
```

Most bugs in deep learning are **shape bugs**. Print `.shape` often.

## Autograd

Set `requires_grad=True` and PyTorch records every operation, then `.backward()` computes gradients with the chain rule:

```python
w = torch.tensor(3.0, requires_grad=True)
loss = (w * 2 - 10) ** 2       # minimum at w = 5
loss.backward()
w.grad                          # d(loss)/dw = 2·(2w − 10)·2 = -16
```

## Gradient descent

To minimise a loss, step **against** the gradient:

> w ← w − η · ∂L/∂w

where η is the **learning rate**.

```python
w = torch.tensor(0.0, requires_grad=True)
for step in range(50):
    loss = (w * 2 - 10) ** 2
    loss.backward()
    with torch.no_grad():
        w -= 0.05 * w.grad
    w.grad.zero_()              # gradients accumulate unless cleared
print(w.item())                 # ≈ 5.0
```

- Learning rate too small: very slow. Too large: the loss explodes or oscillates.
- **Stochastic** gradient descent uses small random batches of data per step: noisier, much cheaper, and the noise often helps generalisation.

## Practice

1. Fit *y = a·x + b* to 100 noisy points generated with a = 2, b = −1 using the loop above. Recover a and b.
2. Try learning rates 0.001, 0.05 and 0.5. Plot the loss curves.
3. What happens if you remove `w.grad.zero_()`? Why?

@lesson Building and training an MLP | 35
# Building and training an MLP

A **multi-layer perceptron (MLP)** stacks linear layers with non-linear **activations** in between. Without the non-linearity, any stack of linear layers collapses into a single linear layer.

## A model with `nn.Module`

```python
import torch, torch.nn as nn
from torchvision import datasets, transforms
from torch.utils.data import DataLoader

tf = transforms.ToTensor()
train = datasets.FashionMNIST("data", train=True, download=True, transform=tf)
test  = datasets.FashionMNIST("data", train=False, download=True, transform=tf)
train_dl = DataLoader(train, batch_size=128, shuffle=True)
test_dl  = DataLoader(test, batch_size=512)

model = nn.Sequential(
    nn.Flatten(),                 # 1×28×28 → 784
    nn.Linear(784, 256), nn.ReLU(),
    nn.Linear(256, 10),           # 10 classes: raw scores ("logits")
).to(device)
```

## The training loop

Every PyTorch training loop has the same five lines at its core:

```python
loss_fn = nn.CrossEntropyLoss()           # softmax + negative log-likelihood
opt = torch.optim.AdamW(model.parameters(), lr=1e-3)

for epoch in range(5):
    model.train()
    for xb, yb in train_dl:
        xb, yb = xb.to(device), yb.to(device)
        loss = loss_fn(model(xb), yb)     # 1. forward
        opt.zero_grad()                    # 2. clear old gradients
        loss.backward()                    # 3. backprop
        opt.step()                         # 4. update weights

    model.eval()
    correct = 0
    with torch.no_grad():                  # 5. evaluate without tracking gradients
        for xb, yb in test_dl:
            correct += (model(xb.to(device)).argmax(1) == yb.to(device)).sum().item()
    print(epoch, correct / len(test))
```

This reaches roughly 88% test accuracy on Fashion-MNIST.

## Key ideas

| Piece | Role |
|---|---|
| **ReLU** | `max(0, x)`: simple, fast non-linearity |
| **Cross-entropy loss** | punishes confident wrong class predictions |
| **Adam / AdamW** | gradient descent with per-parameter adaptive step sizes; a strong default |
| **Epoch** | one full pass over the training data |
| `model.train()` / `model.eval()` | switch layers like dropout and batch norm between modes |

## Fighting overfitting

- **Validation set** and **early stopping**: stop when validation loss stops improving.
- **Dropout** (`nn.Dropout(0.2)`): randomly zero activations during training.
- **Weight decay**: AdamW's `weight_decay` shrinks weights slightly each step.
- **More data** or **data augmentation**.

## Practice

1. Train the MLP and plot training vs test accuracy per epoch.
2. Add a second hidden layer and dropout. Does test accuracy improve?
3. Show 10 misclassified test images with their true and predicted labels. Are the mistakes understandable?

@module Module 2 · Vision with convolutional networks
@lesson Convolutions and CNNs | 35
# Convolutions and CNNs

An MLP treats an image as a flat list of numbers: it ignores that nearby pixels are related and must relearn a pattern separately at every position. **Convolutional neural networks (CNNs)** fix both problems.

## The convolution

A small **kernel** (e.g. 3×3 weights) slides across the image, computing a weighted sum at each position. The output is a **feature map** showing where the pattern appears.

- **Weight sharing**: the same kernel is used everywhere, so a CNN has far fewer parameters.
- **Translation equivariance**: a cat's ear is detected wherever it is.
- A layer has many kernels (**channels**), each learning a different pattern.

| Setting | Effect |
|---|---|
| `kernel_size=3` | size of the pattern window |
| `padding=1` | keeps width and height the same for 3×3 |
| `stride=2` | moves 2 pixels at a time; halves the size |
| **Max pooling** | keeps the largest value in each 2×2 block; downsamples |

Early layers learn edges and colours; deeper layers combine them into textures, parts and objects.

## A small CNN

```python
class SmallCNN(nn.Module):
    def __init__(self, n_classes=10):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 32, 3, padding=1), nn.BatchNorm2d(32), nn.ReLU(), nn.MaxPool2d(2),   # 28 → 14
            nn.Conv2d(32, 64, 3, padding=1), nn.BatchNorm2d(64), nn.ReLU(), nn.MaxPool2d(2),  # 14 → 7
        )
        self.head = nn.Sequential(nn.Flatten(), nn.Dropout(0.3), nn.Linear(64 * 7 * 7, n_classes))

    def forward(self, x):
        return self.head(self.features(x))
```

Train it with the same loop as the MLP. On Fashion-MNIST it reaches about 91–92%, with fewer parameters than the MLP.

**Batch normalisation** normalises activations within each batch, which makes training faster and more stable.

## Data augmentation

Show the model slightly changed copies of each training image so it learns what *doesn't* matter:

```python
train_tf = transforms.Compose([
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(10),
    transforms.ToTensor(),
])
```

Apply augmentation to **training** data only. Choose augmentations that keep the label true: flipping a "6" vertically turns it into something else.

## Practice

1. Train `SmallCNN` and compare its accuracy and parameter count (`sum(p.numel() for p in model.parameters())`) with the MLP.
2. Visualise the 32 first-layer kernels as tiny images. What patterns do they detect?
3. Add augmentation. Does the gap between training and test accuracy shrink?

@lesson Transfer learning for real images | 30
# Transfer learning for real images

Training a large CNN from scratch needs millions of images. Instead, start from a model **pre-trained** on ImageNet (1.2 million photos, 1,000 classes) and adapt it. Its early layers already detect general edges, textures and shapes.

## Fine-tuning a ResNet

```python
from torchvision import models

weights = models.ResNet18_Weights.DEFAULT
model = models.resnet18(weights=weights)

for p in model.parameters():          # 1. freeze the pre-trained backbone
    p.requires_grad = False
model.fc = nn.Linear(model.fc.in_features, n_classes)   # 2. new head for your classes
model = model.to(device)

opt = torch.optim.AdamW(model.fc.parameters(), lr=1e-3)
preprocess = weights.transforms()      # 3. resize and normalise exactly as in pre-training
```

Train the head for a few epochs. Then optionally **unfreeze** the whole network and continue with a much smaller learning rate (e.g. 1e-5) to fine-tune everything.

## Your own dataset

Put images in one folder per class:

```
data/train/healthy/*.jpg
data/train/leaf_blight/*.jpg
data/val/healthy/*.jpg
...
```

```python
train = datasets.ImageFolder("data/train", transform=preprocess)
```

Open datasets on Kaggle and in the PlantVillage collection include crop-disease images. Check each dataset's licence before using it.

## Pitfalls

- **Leakage**: near-duplicate photos (same leaf, same burst) in both train and validation give inflated scores. Split by source (plant, field, day), not by photo.
- **Shortcut learning**: if every "diseased" photo was taken on a white table, the model may learn the table. Check with **Grad-CAM** or by testing on photos from a new setting.
- **Field vs lab**: a model trained on clean lab images often fails on phone photos taken in a real field. Test on the conditions where it will be used.

## Beyond classification

| Task | Output | Typical models |
|---|---|---|
| Classification | one label per image | ResNet, EfficientNet, ViT |
| Object detection | boxes + labels | YOLO, Faster R-CNN |
| Segmentation | a label for every pixel | U-Net, Mask R-CNN |

## Practice

1. Fine-tune ResNet-18 on a small 3–5 class image dataset. Report validation accuracy with the frozen backbone, then after full fine-tuning.
2. Take 10 photos of your own with a phone and test the model on them. What changes?
3. Write down two ways your dataset could contain a shortcut, and how you'd check.

@module Module 3 · Sequences, attention and transformers
@lesson Embeddings and recurrent networks | 30
# Embeddings and recurrent networks

Text, speech, sensor readings and prices are **sequences**: order matters and lengths vary.

## From words to vectors

1. **Tokenise**: split text into tokens (words or sub-words) and map each to an integer id.
2. **Embed**: an `nn.Embedding(vocab_size, dim)` layer is a learnable lookup table that turns each id into a dense vector.

```python
emb = nn.Embedding(num_embeddings=20_000, embedding_dim=128, padding_idx=0)
ids = torch.tensor([[12, 845, 3, 0, 0]])     # a padded sentence of 5 tokens
emb(ids).shape                                # (1, 5, 128)
```

During training, words used in similar contexts end up with similar vectors.

## Recurrent neural networks (RNNs)

An RNN reads a sequence one step at a time, updating a **hidden state** *h* that summarises everything so far:

> hₜ = tanh(W·xₜ + U·hₜ₋₁ + b)

Plain RNNs struggle with long sequences: gradients shrink (**vanish**) or blow up (**explode**) as they flow back through many steps. **LSTMs** and **GRUs** add **gates** that learn what to keep, forget and output, which lets information survive much longer.

```python
class SentimentLSTM(nn.Module):
    def __init__(self, vocab, dim=128, hidden=128):
        super().__init__()
        self.emb = nn.Embedding(vocab, dim, padding_idx=0)
        self.lstm = nn.LSTM(dim, hidden, batch_first=True, bidirectional=True)
        self.out = nn.Linear(2 * hidden, 2)

    def forward(self, ids):
        h, _ = self.lstm(self.emb(ids))       # (batch, seq, 2·hidden)
        return self.out(h.mean(dim=1))        # average over time steps
```

Use gradient clipping (`torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)`) to stop exploding gradients.

## Limits of RNNs

- They process tokens **one after another**, so they can't use a GPU's parallelism across the sequence.
- Information from far back still fades.

Both limits are why transformers replaced RNNs for most language tasks, as the next lesson shows.

## Practice

1. Train `SentimentLSTM` on a small labelled review dataset (for example IMDB from the Hugging Face `datasets` library). Report validation accuracy.
2. Compare a unidirectional and a bidirectional LSTM.
3. Why does padding need `padding_idx=0`, and what problem would averaging over padded positions cause? How would you fix it?

@lesson Attention and the transformer | 40
# Attention and the transformer

**Attention** lets every position in a sequence look directly at every other position and decide which ones matter, regardless of distance.

## Scaled dot-product attention

Each token produces three vectors via learned linear layers:

- **Query (Q)**: what am I looking for?
- **Key (K)**: what do I contain?
- **Value (V)**: what will I pass on?

> Attention(Q, K, V) = softmax(Q·Kᵀ / √d) · V

The softmax turns query–key similarity scores into weights that sum to 1; each output is a weighted mix of values. Dividing by √d keeps scores from growing too large.

```python
import torch.nn.functional as F

def attention(q, k, v, mask=None):
    scores = q @ k.transpose(-2, -1) / q.size(-1) ** 0.5
    if mask is not None:
        scores = scores.masked_fill(mask == 0, float("-inf"))
    return F.softmax(scores, dim=-1) @ v
```

(PyTorch's built-in `F.scaled_dot_product_attention` does the same, faster.)

## Multi-head attention

Run several attention "heads" in parallel, each with its own Q, K, V projections, so different heads can track different relationships (grammar, coreference, topic), then concatenate the results.

## The transformer block

```
x → LayerNorm → Multi-head attention → + x (residual)
  → LayerNorm → Feed-forward MLP     → + x (residual)
```

Stack N of these. Two more ingredients:

- **Positional information**: attention itself ignores order, so position is added through learned position embeddings or rotary embeddings (RoPE).
- **Residual connections + layer norm**: keep gradients healthy through deep stacks.

## Three families

| Family | Attention | Trained to | Examples |
|---|---|---|---|
| **Encoder** | sees the whole input | fill in masked words | BERT; good for classification and embeddings |
| **Decoder** | each token sees only the past (**causal mask**) | predict the next token | GPT, Gemini, Llama; good for generation |
| **Encoder–decoder** | both | map input to output | T5; translation, summarisation |

## Beyond text

**Vision Transformers (ViT)** split an image into 16×16 patches and treat them as tokens. With enough data and pre-training, they match or beat CNNs. The same block now powers speech, protein and multimodal models.

## Cost

Attention compares every token with every other, so cost grows with the **square** of sequence length. That's why models have a context limit and why efficient attention variants exist.

## Practice

1. Implement `attention` and check that its output matches `F.scaled_dot_product_attention` on random tensors.
2. Build a causal mask for a sequence of length 5 (`torch.tril(torch.ones(5, 5))`) and print the attention weights. Which positions can token 3 see?
3. Follow Karpathy's "Let's build GPT" video and train a tiny character-level transformer on a text of your choice.

@lesson Fine-tuning pre-trained transformers | 30
# Fine-tuning pre-trained transformers

As with images, you rarely train a transformer from scratch. The **Hugging Face** `transformers` library provides thousands of pre-trained models.

## A sentiment classifier in a few lines

```python
from transformers import pipeline
clf = pipeline("sentiment-analysis")
clf("The new course was surprisingly clear.")
```

## Fine-tuning on your own labels

```python
from datasets import load_dataset
from transformers import AutoTokenizer, AutoModelForSequenceClassification, TrainingArguments, Trainer

name = "distilbert-base-uncased"
tok = AutoTokenizer.from_pretrained(name)
model = AutoModelForSequenceClassification.from_pretrained(name, num_labels=2)

ds = load_dataset("imdb")
ds = ds.map(lambda b: tok(b["text"], truncation=True, max_length=256), batched=True)

args = TrainingArguments("out", per_device_train_batch_size=16, num_train_epochs=1,
                         learning_rate=2e-5, eval_strategy="epoch")
trainer = Trainer(model=model, args=args, train_dataset=ds["train"].shuffle(seed=0).select(range(5000)),
                  eval_dataset=ds["test"].shuffle(seed=0).select(range(2000)), processing_class=tok)
trainer.train()
```

(Argument names change between `transformers` versions; check the current docs if one is rejected.)

## Bangla and other languages

English-only models tokenise Bangla poorly and understand it worse. Use a multilingual or Bangla model, for example **XLM-RoBERTa** or **BanglaBERT** (from BUET's CSE NLP group) on the Hugging Face Hub. Check each model's card for its training data, licence and known limits.

## Making it fit

| Technique | What it does |
|---|---|
| Mixed precision (`fp16=True`/`bf16=True`) | halves memory, faster on modern GPUs |
| Gradient accumulation | simulates a bigger batch on a small GPU |
| **LoRA** (the `peft` library) | trains small low-rank adapter matrices instead of all weights |
| Quantisation (8-bit / 4-bit) | stores weights in fewer bits to fit larger models |

## Evaluate like a scientist

- Compare against a simple baseline (e.g. TF-IDF + logistic regression). Sometimes it's close, at a tiny fraction of the cost.
- Report results on a held-out test set, with the metric that matches the cost of mistakes.
- Look at errors by hand: sarcasm, mixed Bangla–English ("Banglish"), negation.
- Record the model card details for your fine-tuned model: data, intended use and limits.

## What's next

Use these skills in the **Bangla language model**, **Smart agriculture prediction** and **Healthcare assistant** projects in the Project Lab, and continue with **NLP, Large Language Models & RAG**.
