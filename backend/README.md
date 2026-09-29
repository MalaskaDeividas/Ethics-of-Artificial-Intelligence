1. deploied searXNG by docker, and modify it's port to 5679(I forget the default port is 5679 or not). 
Then use docker exec enter docker to modify setting.yml, under search section there's a format and add json.
2. don't forget read comment and TODO to modify code and running it on you own pc. I use lmstudio, if you use others follow code comment and change it.

3. Run text to image model, change listen ip to yours
```
./build/bin/sd-server \
  --diffusion-model model/qwen-image-2.1-UC-Q8_0.gguf \
  --llm model/qwen3vl_8b_bf16.safetensors \
  --vae model/qwen_image_2.1_vae_bf16.safetensors \
  --diffusion-fa \
  --listen-ip 192.168.50.230 --listen-port 1235
```
4. the entrence at main.py. plz run it after deploying the frontend.