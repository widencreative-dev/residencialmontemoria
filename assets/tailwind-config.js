/*
 * Paleta e tipografia do Residencial Monte Moriá para o Tailwind carregado via CDN.
 *
 * Este arquivo precisa ser incluído DEPOIS do script do Tailwind e ANTES do
 * fechamento do <head>, porque o CDN lê `tailwind.config` no momento em que
 * varre o documento:
 *
 *   <script src="https://cdn.tailwindcss.com"></script>
 *   <script src="assets/tailwind-config.js"></script>
 *
 * As mesmas cores estão espelhadas como variáveis CSS em assets/styles.css,
 * para que o CSS customizado use os tokens sem depender do Tailwind. Ao mudar
 * uma cor aqui, mudar também lá.
 */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        /* Azul petróleo (#056370 = 700), cor principal do Monte Moriá.
           O nome "olive" ficou do modelo para não reescrever as classes. */
        olive: {
          950: "#022f35",
          900: "#033f47",
          800: "#04505a",
          700: "#056370",
          600: "#0a7684",
          500: "#2b8c98",
          400: "#5aa8b2",
          300: "#92c6cd",
          200: "#c4e0e3",
          100: "#e3f0f1",
          50: "#f2f8f9",
        },
        /* Antes dourado; agora tons de petróleo para números, ícones e detalhes. */
        gold: {
          900: "#033f47",
          800: "#056370",
          700: "#056370",
          600: "#056370",
          500: "#056370",
          400: "#7cc0c9",
          300: "#a6d5db",
          200: "#c4e0e3",
          100: "#e3f0f1",
          50: "#f2f8f9",
        },
        /* Grafite / azul-marinho, texto e contraste */
        graphite: {
          950: "#10131a",
          900: "#171b24",
          800: "#232833",
          700: "#333a47",
          600: "#4b5262",
          500: "#6b7180",
          400: "#9298a3",
          300: "#bcc0c7",
          200: "#dcdee2",
          100: "#eceef0",
        },
        /* Cor dos botões de ação: o mesmo petróleo, com hover mais escuro. */
        acao: { DEFAULT: "#056370", escuro: "#033f47" },
        /* Fundo: branco puro (pedido da cliente) */
        paper: {
          DEFAULT: "#ffffff",
          dim: "#f5f7f7",
        },
      },
      fontFamily: {
        /* Raleway nos títulos e elementos de voz forte; Roboto no texto. */
        display: ['"Raleway"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"Roboto"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 20px 45px -20px rgb(23 27 36 / 0.25)",
      },
    },
  },
};
