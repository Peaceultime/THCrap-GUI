module.exports = class SidePopup
{
	#loading = 0;
	#loadValue = 0;
	#duration = 0;
	#progression = 0;
	#time = 0;
	#node = null;
	#textNode = null;
	#loadingNode = null;
	#error = false;
	#deleted = false;
	#translate = true;
	static #max = 5;
	static #popups = [];
	static #popupContainer = null;
	static load()
	{
		SidePopup.#popupContainer = document.createElement("div");
		SidePopup.#popupContainer.classList.add("popup-container");
		document.appBody.appendChild(SidePopup.#popupContainer);
	}
	static add(popup)
	{
		SidePopup.#popupContainer.appendChild(popup.node);
		SidePopup.#popups.push(popup);

		if(SidePopup.#popups.length > SidePopup.#max)
		{
			const removed = SidePopup.#popups[0];
			SidePopup.#popups.splice(0, 1);
			removed.node.classList.add("fade-up");
			setTimeout(function(n) { SidePopup.#popupContainer.removeChild(n); }, 300, removed.node);
		}
	}
	static remove(popup)
	{
		const index = SidePopup.#popups.findIndex(e => e === popup);
		if(index === -1)
			return;

		SidePopup.#popups.splice(index, 1);
		popup.node.classList.add("fade-right");
		setTimeout(function(n) { SidePopup.#popupContainer.removeChild(n); }, 300, popup.node);
	}
	constructor(text, opts)
	{
		opts = Object.assign({}, opts);
		//Loading has priority over duration
		if(opts.loading)
			this.#loading = opts.loading;
		else
			this.#duration = opts.duration || 5000;
		this.#error = opts.error;
		this.#translate = opts.translate !== undefined ? opts.translate : true;

		this.#node = document.createElement("div");
		this.#node.addEventListener("click", this.fade.bind(this));
		this.#node.classList.add("side-popup");
		if(this.#error)
			this.#node.classList.add("side-error");

		this.#textNode = document.createElement("div");
		this.#textNode.classList.add("side-text");
		if(this.#translate)
		{
			this.#textNode.textContent = askTranslation(text);
			this.#textNode.setAttribute("trid", text);
		}
		else
			this.#textNode.textContent = text;

		this.#loadingNode = document.createElement("div");
		this.#loadingNode.classList.add("side-loading");
		if(this.#loading)
			this.#loadingNode.classList.add("side-load");

		this.#node.appendChild(this.#textNode);
		this.#node.appendChild(this.#loadingNode);

		SidePopup.add(this);

		if(this.#duration)
		{
			this.#time = performance.now();
			this.progress(performance.now());
		}
	}
	update(text, load, error)
	{
		if(this.#deleted)
			return;
		if(text && text !== "")
		{
			if(this.#translate)
			{
				this.#textNode.textContent = askTranslation(text);
				this.#textNode.setAttribute("trid", text);
			}
			else
				this.#textNode.textContent = text;
		}
		if(load && this.#loading)
		{
			this.#loadValue += load;
			this.#loadingNode.style.width = (this.#loadValue / this.#loading * 100) + "%";
			if(this.#loadValue >= this.#loading)
				setTimeout(function(p) { p.fade(); }, 2000, this);
		}
	}
	progress(time)
	{
		if(this.#progression < this.#duration || this.#deleted)
			requestAnimationFrame(this.progress.bind(this));
		else
			this.fade();

		const elapsed = time - this.#time;
		this.#progression += elapsed;
		this.#time = time;

		this.#loadingNode.style.width = (this.#progression < this.#duration ? (this.#progression / this.#duration * 100) + "%" : "100%");
	}
	fade()
	{
		this.#deleted = true;
		SidePopup.remove(this);
	}
	get node()
	{
		return this.#node;
	}
}
