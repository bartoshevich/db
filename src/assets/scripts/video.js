
 

 export function initVideo() {

   const YOUTUBE_EMBED_BASE = "https://www.youtube-nocookie.com/embed/";
   const YOUTUBE_PARAMS = "?rel=0&showinfo=0&autoplay=1";

   const getYouTubeId = (url) => {
     try {
       const parsedUrl = url instanceof URL ? url : new URL(url);

       if (parsedUrl.hostname === "youtu.be") {
         return parsedUrl.pathname.slice(1);
       } else if (
         parsedUrl.hostname.includes("youtube.com") &&
         parsedUrl.searchParams.has("v")
       ) {
         return parsedUrl.searchParams.get("v");
       } else if (
         parsedUrl.hostname.includes("youtube.com") &&
         parsedUrl.pathname.startsWith("/embed/")
       ) {
         return parsedUrl.pathname.slice(7);
       } else {
         return null;
       }
     } catch (error) {
       console.warn("Ошибка при парсинге YouTube URL:", error);
       return null;
     }
   };

   const createIframe = (id) => {
     const iframe = document.createElement("iframe");
     iframe.allowFullscreen = true;
     iframe.allow = "autoplay";
     iframe.classList.add("video__media");
     iframe.loading = "lazy";
     iframe.src = `${YOUTUBE_EMBED_BASE}${id}${YOUTUBE_PARAMS}`;

     return iframe;
   };

   const setupVideo = (videoElement) => {
     const link = videoElement.querySelector(".video__link");
     const button = videoElement.querySelector(".video__button");

     if (!link) {
       console.warn("Видео-контейнер не содержит .video__link элемента");
       return;
     }

     const videoId = getYouTubeId(link.href);

     if (!videoId) {
       console.warn("Невозможно извлечь ID видео из ссылки:", link.href);
       return;
     }

     const handleClick = (event) => {
       event.preventDefault();

       if (videoElement.querySelector("iframe")) {
         return;
       }

       if (link) link.remove();
       if (button) button.remove();

       const iframe = createIframe(videoId);
       videoElement.appendChild(iframe);

       videoElement.removeEventListener("click", handleClick);
     };

     videoElement.addEventListener("click", handleClick);

     videoElement.classList.add("video--enabled");
   };

   const videos = document.querySelectorAll(".video");
   videos.forEach(setupVideo);

}