import os
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
import json 
import unsloth
import torch 
from unsloth import FastLanguageModel 
from trl import SFTTrainer 
from transformers import TrainingArguments 
from datasets import Dataset 


with open("/home/shorouk/Documents/shorouk/project/doc2dial_v1.0.1/doc2dial_doc.json", "r") as f:
    docs = json.load(f)["doc_data"]
with open("/home/shorouk/Documents/shorouk/project/doc2dial_v1.0.1/doc2dial_dial_train.json", "r") as f:
    dials = json.load(f)["dial_data"]

doc_map = {}
for domain in docs.values():
    for doc_id, content in domain.items():
        doc_map[doc_id] = content["doc_text"]

formatted_data = []

for domain in dials.values(): 
    for doc_id, dialogues in domain.items():
        full_text = doc_map.get(doc_id, "")
        
        for dial in dialogues:
            turns = dial["turns"]
            for i in range(len(turns) - 1):
                if turns[i]["role"] == "user" and turns[i+1]["role"] == "agent":

                    context_snippet = full_text[:2000] 
                    
                    formatted_data.append({
                        "instruction": "You are a helpful assistant. Answer the question using ONLY the provided context.",
                        "input": f"CONTEXT:\n{context_snippet}\n\nUSER QUESTION:\n{turns[i]['utterance']}",
                        "output": turns[i+1]["utterance"]
                    })

dataset = Dataset.from_list(formatted_data).shuffle(seed=3407)
dataset = dataset.select(range(min(len(dataset), 5000))) 


model_name = "unsloth/granite-4.0-h-micro"
max_seq_length = 4096 

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = model_name,
    max_seq_length = max_seq_length,
    load_in_4bit = True, 
    device_map = {"": 0}, 
)

model = FastLanguageModel.get_peft_model( 
    model,
    r = 16, 
    target_modules = ["q_proj", "k_proj", "v_proj", "o_proj"],
    lora_alpha = 32,
    lora_dropout = 0,
    bias = "none",
    use_gradient_checkpointing = "unsloth", 
    random_state = 3407,
)

def format_prompt(examples):
    texts = [] 

    for inst, inp, out in zip(examples["instruction"], examples["input"], examples["output"]):
        messages = [
            {"role": "system", "content": inst},
            {"role": "user", "content": inp},
            {"role": "assistant", "content": out}
        ] 
        texts.append(tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False))
    return { "text" : texts }

dataset = dataset.map(format_prompt, batched = True)

trainer = SFTTrainer(
    model = model,
    tokenizer = tokenizer,
    train_dataset = dataset,
    dataset_text_field = "text",
    max_seq_length = max_seq_length,
    args = TrainingArguments(
        per_device_train_batch_size = 2, 
        gradient_accumulation_steps = 4, 
        warmup_steps = 10,
        max_steps = 150, 
        learning_rate = 2e-4,
        fp16 = not torch.cuda.is_bf16_supported(),
        bf16 = torch.cuda.is_bf16_supported(),
        optim = "adamw_8bit",
        weight_decay = 0.01,
        logging_steps = 1,
        lr_scheduler_type = "linear",
        seed = 3407,
        output_dir = "outputs",
    ),
)

trainer.train()

model.save_pretrained("granite4_notion_model")
tokenizer.save_pretrained("granite4_notion_model")