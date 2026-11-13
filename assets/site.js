      (function () {
        "use strict";

        var semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        /* ---- Meta Pixel: eventos de conversão ----------------------------
           O PageView já sai do <head>. Aqui ficam o Contact (clique em
           qualquer link do WhatsApp) e o Lead (formulário enviado). */
        var rastrear = function (evento) {
          if (typeof window.fbq === "function") window.fbq("track", evento);
        };
        document.addEventListener("click", function (ev) {
          var link = ev.target.closest && ev.target.closest('a[href*="wa.me/"]');
          if (link) rastrear("Contact");
        });

        /* ---- Lenis: scroll suave ----------------------------------------
           Fica desligado para quem pede menos movimento; nesse caso o
           navegador cuida da rolagem normalmente. */
        var lenis = null;
        /* Easing padrão do Lenis (exponencial de saída), escrita à mão pra
           poder ser reaproveitada no clique em âncora — assim a roda do mouse
           e o menu desaceleram do mesmo jeito. */
        var suavizacao = function (t) {
          return Math.min(1, 1.001 - Math.pow(2, -10 * t));
        };
        /* Em tela de toque o Lenis não suaviza nada (syncTouch fica
           desligado e a rolagem é a nativa do celular), mas o laço de
           requestAnimationFrame abaixo continuaria rodando a cada quadro à
           toa, gastando CPU e bateria. Sem ele, irPara() cai no
           window.scrollTo suave do navegador, que no celular é o bastante. */
        var telaDeToque = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
        if (!semMovimento && !telaDeToque && typeof Lenis !== "undefined") {
          lenis = new Lenis({
            autoRaf: false,
            duration: 1.4,
            easing: suavizacao,
            smoothWheel: true,
            wheelMultiplier: 1,
          });
          (function animar(t) {
            lenis.raf(t);
            requestAnimationFrame(animar);
          })(0);
        }

        /* Rolagem até âncoras, respeitando a altura do header fixo. Mede o
           header de verdade em vez de usar um número fixo: a altura muda
           conforme a logo/breakpoint, e um valor fixo desalinha (como
           aconteceu quando a logo cresceu e o antigo "-96" ficou 17px curto,
           escondendo o topo do alvo atrás do header). */
        function irPara(alvo) {
          var el = document.querySelector(alvo);
          if (!el) return;
          var header = document.getElementById("site-header");
          var alturaHeader = header ? header.getBoundingClientRect().height : 0;
          var topo = el.getBoundingClientRect().top + window.scrollY - alturaHeader - 3;
          if (lenis) lenis.scrollTo(topo, { duration: 1.1, easing: suavizacao });
          else window.scrollTo({ top: topo, behavior: semMovimento ? "auto" : "smooth" });
        }

        document.addEventListener("click", function (ev) {
          var link = ev.target.closest('a[href^="#"]');
          if (!link) return;
          var alvo = link.getAttribute("href");
          if (alvo === "#" || !document.querySelector(alvo)) return;
          ev.preventDefault();
          irPara(alvo);
          history.replaceState(null, "", alvo);
          if (link.hasAttribute("data-chamar-form")) chamarFormulario(document.querySelector(alvo));
        });

        /* CTA da seção do formulário: depois de rolar até o cartão, o botão
           da etapa visível ("Continuar" ou "Enviar") dá um salto pra pessoa
           entender que é ali que ela continua. Se o cartão já está na tela
           (desktop, lado a lado) salta na hora; senão espera a rolagem, que
           dura ~1,1s com o Lenis. */
        function chamarFormulario(cartao) {
          if (!cartao) return;
          var botao = cartao.querySelector(".form-step:not([hidden]) .cta-btn--whatsapp");
          if (!botao) return;
          var caixa = cartao.getBoundingClientRect();
          var visivel = caixa.top >= 0 && caixa.bottom <= window.innerHeight;
          setTimeout(function () {
            botao.classList.remove("cta-btn--chamando");
            void botao.offsetWidth; // reinicia a animação em cliques seguidos
            botao.classList.add("cta-btn--chamando");
            // Sem animação não há animationend: tira o contorno no tempo.
            if (semMovimento) {
              setTimeout(function () {
                botao.classList.remove("cta-btn--chamando");
              }, 2000);
            }
          }, visivel ? 0 : 1000);
        }

        /* ---- Vídeo do hero com economia de dados ---------------------------
           Quem liga "economia de dados" no celular (Chrome/Android expõe
           isso em navigator.connection.saveData) fica só com o pôster: as
           <source> saem antes de o navegador começar a baixar os 1,3 MB do
           vídeo. O <video> fica no lugar, com a foto desfocada de fundo. */
        var conexao = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (conexao && conexao.saveData) {
          Array.prototype.forEach.call(document.querySelectorAll(".hero-video-fundo"), function (video) {
            Array.prototype.forEach.call(video.querySelectorAll("source"), function (s) {
              s.remove();
            });
            video.removeAttribute("autoplay");
            video.load();
          });
        }

        /* ---- Palavra que troca no título do hero --------------------------
           A cada 2,6s a palavra atual sobe e some e a próxima sobe de baixo
           pro lugar dela. A largura do contêiner é fixada em px e animada
           até a da palavra nova (uma palavra mais curta não encolhe a linha
           de supetão). Só começa depois que o título já entrou na tela. */
        var giro = document.querySelector("[data-palavras]");
        if (giro && !semMovimento && giro.animate) {
          var palavras = giro.getAttribute("data-palavras").split("|");
          var indice = 0;
          var atualGiro = giro.querySelector(".palavra-giro__item");
          var curva = "cubic-bezier(0.23, 1, 0.32, 1)";
          var trocarPalavra = function () {
            indice = (indice + 1) % palavras.length;
            var saindo = atualGiro;
            var nova = document.createElement("span");
            nova.className = "palavra-giro__item";
            nova.textContent = palavras[indice];
            giro.appendChild(nova);
            giro.style.width = saindo.getBoundingClientRect().width + "px";
            void giro.offsetWidth;
            giro.style.width = nova.getBoundingClientRect().width + "px";
            saindo.animate(
              [
                { transform: "translateY(0)", opacity: 1 },
                { transform: "translateY(-0.5em)", opacity: 0 },
              ],
              { duration: 380, easing: curva, fill: "forwards" }
            ).onfinish = function () {
              saindo.remove();
            };
            nova.animate(
              [
                { transform: "translateY(0.5em)", opacity: 0 },
                { transform: "translateY(0)", opacity: 1 },
              ],
              { duration: 480, delay: 120, easing: curva, fill: "backwards" }
            );
            atualGiro = nova;
          };
          setTimeout(function () {
            setInterval(trocarPalavra, 2600);
          }, 1200);
        }

        /* ---- Faixa em paralaxe ------------------------------------------
           A foto é 40% mais alta que a faixa; enquanto a faixa atravessa a
           tela, ela anda dessa sobra de cima até a de baixo, ou seja, mais
           devagar que a página. O progresso vai de 1 (faixa entrando por
           baixo) a 0 (saindo por cima). Fora da tela não calcula nada. */
        var paralaxes = document.querySelectorAll("[data-paralaxe]");
        if (!semMovimento && paralaxes.length) {
          var agendado = false;
          var atualizarParalaxe = function () {
            agendado = false;
            var alturaTela = window.innerHeight;
            Array.prototype.forEach.call(paralaxes, function (faixa) {
              var img = faixa.querySelector("img");
              if (!img) return;
              var caixa = faixa.getBoundingClientRect();
              if (caixa.bottom < 0 || caixa.top > alturaTela) return;
              var progresso = (caixa.top + caixa.height) / (alturaTela + caixa.height);
              var sobra = img.offsetHeight - caixa.height;
              img.style.transform = "translate3d(0," + ((0.5 - progresso) * sobra).toFixed(1) + "px,0)";
            });
          };
          var pedirParalaxe = function () {
            if (agendado) return;
            agendado = true;
            requestAnimationFrame(atualizarParalaxe);
          };
          window.addEventListener("scroll", pedirParalaxe, { passive: true });
          window.addEventListener("resize", pedirParalaxe);
          atualizarParalaxe();
        }

        document.addEventListener("animationend", function (ev) {
          if (ev.animationName === "chamar-brilho") {
            ev.target.classList.remove("cta-btn--chamando");
          }
        });

        /* ---- Menu mobile ------------------------------------------------ */
        var header = document.getElementById("site-header");
        var toggle = document.getElementById("menu-toggle");
        var menu = document.getElementById("mobile-menu");
        var iconMenu = document.getElementById("icon-menu");
        var iconClose = document.getElementById("icon-close");

        function fecharMenu() {
          if (!menu) return;
          menu.classList.add("hidden");
          if (iconMenu) iconMenu.classList.remove("hidden");
          if (iconClose) iconClose.classList.add("hidden");
          if (toggle) toggle.setAttribute("aria-expanded", "false");
          if (header) header.classList.remove("header--aberto");
        }

        if (toggle && menu) {
          toggle.addEventListener("click", function () {
            var aberto = !menu.classList.contains("hidden");
            menu.classList.toggle("hidden", aberto);
            if (iconMenu) iconMenu.classList.toggle("hidden", !aberto);
            if (iconClose) iconClose.classList.toggle("hidden", aberto);
            toggle.setAttribute("aria-expanded", String(!aberto));
            /* Menu aberto no topo da página: a barra escurece junto, senão o
               painel fica solto sobre o vídeo sem o fundo do header. */
            if (header) header.classList.toggle("header--aberto", !aberto);
          });
          menu.addEventListener("click", function (ev) {
            if (ev.target.closest("a")) fecharMenu();
          });
          document.addEventListener("keydown", function (ev) {
            if (ev.key === "Escape") fecharMenu();
          });
          /* Clique fora do header fecha o menu, como no site da Widen Club. */
          document.addEventListener("click", function (ev) {
            if (header && !header.contains(ev.target)) fecharMenu();
          });
        }

        /* ---- Header: barra escura ao rolar -------------------------------
           Como no site da Widen Club: sempre visível, transparente sobre o
           topo do hero e com a barra escura desfocada depois de 24px de
           rolagem (.header--rolado). */
        if (header) {
          function atualizarHeader() {
            header.classList.toggle("header--rolado", window.scrollY > 24);
          }
          window.addEventListener("scroll", atualizarHeader, { passive: true });
          atualizarHeader();
        }

        /* ---- Menu: destaca a seção que está sendo lida ------------------- */
        var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav-link[data-nav-anchor]"));
        var secoes = navLinks
          .map(function (l) {
            return document.querySelector(l.dataset.navAnchor);
          })
          .filter(Boolean);

        if (secoes.length && "IntersectionObserver" in window) {
          var visiveis = {};
          var spy = new IntersectionObserver(
            function (entradas) {
              entradas.forEach(function (e) {
                if (e.isIntersecting) visiveis["#" + e.target.id] = true;
                else delete visiveis["#" + e.target.id];
              });
              var atual = null;
              for (var i = 0; i < navLinks.length; i++) {
                if (visiveis[navLinks[i].dataset.navAnchor]) {
                  atual = navLinks[i].dataset.navAnchor;
                  break;
                }
              }
              navLinks.forEach(function (l) {
                if (atual && l.dataset.navAnchor === atual) l.setAttribute("aria-current", "true");
                else l.removeAttribute("aria-current");
              });
            },
            { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
          );
          secoes.forEach(function (s) {
            spy.observe(s);
          });
        }

        /* ---- Animação de entrada ----------------------------------------- */
        var reveláveis = document.querySelectorAll(".revelar");
        if ("IntersectionObserver" in window) {
          var obsRevelar = new IntersectionObserver(
            function (entradas) {
              entradas.forEach(function (e) {
                if (!e.isIntersecting) return;
                e.target.classList.add("visivel");
                obsRevelar.unobserve(e.target);
              });
            },
            { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
          );
          Array.prototype.forEach.call(reveláveis, function (el) {
            /* O hero já está na tela na carga: entra direto, sem depender da
               margem de -10% (em telas altas o botão do hero caía nessa
               faixa e só aparecia depois de rolar). */
            if (el.closest("[data-hero]")) {
              requestAnimationFrame(function () {
                el.classList.add("visivel");
              });
              return;
            }
            obsRevelar.observe(el);
          });
        } else {
          Array.prototype.forEach.call(reveláveis, function (el) {
            el.classList.add("visivel");
          });
        }

        /* ---- Contagem animada dos indicadores ----------------------------
           Só anima quando o conteúdo é um número. Enquanto os indicadores
           estiverem como [INSERIR DADO], o texto é exibido sem animação. */
        function animarNumero(el) {
          var bruto = el.textContent.trim();
          var casado = bruto.match(/^([^\d]*)([\d.,]+)(.*)$/);
          if (!casado) return;
          var prefixo = casado[1];
          var sufixo = casado[3];
          var limpo = casado[2].replace(/\./g, "").replace(",", ".");
          var alvo = parseFloat(limpo);
          if (isNaN(alvo)) return;
          var decimais = (limpo.split(".")[1] || "").length;
          // Um inteiro de 4 dígitos sem decimais (ex.: um ano de fundação como
          // "2018") não deve ganhar separador de milhar: "2.018" leria como
          // duas mil e dezoito, não como um ano.
          var pareceAno = decimais === 0 && alvo >= 1000 && alvo <= 9999 && limpo.indexOf(".") === -1;
          if (semMovimento) return;
          var inicio = null;
          var duracao = 1600;
          function passo(ts) {
            if (inicio === null) inicio = ts;
            var p = Math.min((ts - inicio) / duracao, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            var atual = (alvo * eased).toFixed(decimais);
            var textoNumero = pareceAno
              ? Math.round(atual).toString()
              : Number(atual).toLocaleString("pt-BR", {
                  minimumFractionDigits: decimais,
                  maximumFractionDigits: decimais,
                });
            el.textContent = prefixo + textoNumero + sufixo;
            if (p < 1) requestAnimationFrame(passo);
          }
          requestAnimationFrame(passo);
        }

        var contadores = document.querySelectorAll("[data-contador]");
        if (contadores.length && "IntersectionObserver" in window) {
          var obsContador = new IntersectionObserver(
            function (entradas) {
              entradas.forEach(function (e) {
                if (!e.isIntersecting) return;
                animarNumero(e.target);
                obsContador.unobserve(e.target);
              });
            },
            { threshold: 0.5 }
          );
          Array.prototype.forEach.call(contadores, function (el) {
            obsContador.observe(el);
          });
        }

        /* ---- Carrossel de diferenciais -------------------------------------
           Rolagem nativa (scroll-snap, ver .diferenciais-carousel__track no
           CSS) — o JS cuida de 2 coisas: desenhar a barra de progresso
           proporcional ao quanto já rolou, e levar o track direto pra uma
           ponta quando clica numa seta (a seta esquerda sempre vai pro
           primeiro cartão, a direita sempre vai pro último — não é
           incremento por página, é ir direto pro extremo pedido). */
        var carrossel = document.querySelector("[data-carousel]");
        if (carrossel) {
          var trilhoDif = carrossel.querySelector("[data-carousel-track]");
          var progressoDif = carrossel.querySelector("[data-carousel-progress]");
          var btnAnterior = carrossel.querySelector("[data-carousel-prev]");
          var btnProximo = carrossel.querySelector("[data-carousel-next]");

          function atualizarCarrossel() {
            var maximo = trilhoDif.scrollWidth - trilhoDif.clientWidth;

            /* Cada seta some quando não há mais para onde ir naquela direção:
               no começo não existe "anterior", no fim não existe "próximo".
               Some também quando tudo já cabe na tela (máximo 0) e não há o
               que rolar. Usa o atributo disabled, não só CSS, pra sumir
               junto da navegação por teclado e do leitor de tela — um botão
               invisível que ainda recebe foco é pior que um botão inútil.
               A margem de 1px é porque o scrollLeft vem fracionário em telas
               com escala não inteira ou zoom: comparar com === nunca acerta
               as pontas e a seta ficaria presa visível no fim do curso. */
            var noComeco = trilhoDif.scrollLeft <= 1;
            var noFim = trilhoDif.scrollLeft >= maximo - 1;
            btnAnterior.disabled = maximo <= 0 || noComeco;
            btnProximo.disabled = maximo <= 0 || noFim;

            if (maximo <= 0) {
              progressoDif.style.width = "100%";
              return;
            }
            var progresso = trilhoDif.scrollLeft / maximo;
            progressoDif.style.width = Math.max(0, Math.min(1, progresso)) * 100 + "%";
          }

          function irParaExtremo(posicao) {
            var comportamento = semMovimento ? "auto" : "smooth";
            trilhoDif.scrollTo({ left: posicao, behavior: comportamento });
          }

          btnAnterior.addEventListener("click", function () {
            irParaExtremo(0);
          });
          btnProximo.addEventListener("click", function () {
            irParaExtremo(trilhoDif.scrollWidth - trilhoDif.clientWidth);
          });
          trilhoDif.addEventListener("scroll", atualizarCarrossel, { passive: true });
          window.addEventListener("resize", atualizarCarrossel);
          atualizarCarrossel();
        }

        /* ---- Banner do residencial -----------------------------------------
           A rolagem é do próprio navegador (scroll-snap no trilho), então
           arrastar no celular já funciona sem JS. Aqui ficam as setas, as
           bolinhas e a troca automática a cada 6 s, que para de vez na
           primeira interação da pessoa e nem começa com movimento reduzido.
           Também pausa com o mouse em cima e fora da tela. */
        document.querySelectorAll("[data-banner]").forEach(function (banner) {
          var trilho = banner.querySelector("[data-banner-trilho]");
          var slides = trilho ? trilho.children : [];
          var pontos = banner.querySelectorAll("[data-banner-pontos] button");
          if (!trilho || slides.length < 2) return;

          var atual = 0;
          var timer = null;
          var parado = semMovimento;
          var visivel = false;
          var mouseEmCima = false;

          function irPara(i) {
            atual = (i + slides.length) % slides.length;
            trilho.scrollTo({ left: slides[atual].offsetLeft, behavior: semMovimento ? "auto" : "smooth" });
          }

          function marcar() {
            var i = Math.round(trilho.scrollLeft / trilho.clientWidth);
            atual = Math.max(0, Math.min(slides.length - 1, i));
            Array.prototype.forEach.call(pontos, function (p, j) {
              p.classList.toggle("is-ativo", j === atual);
              if (j === atual) p.setAttribute("aria-current", "true");
              else p.removeAttribute("aria-current");
            });
          }

          function agendar() {
            clearInterval(timer);
            timer = null;
            if (parado || !visivel || mouseEmCima) return;
            timer = setInterval(function () {
              irPara(atual + 1);
            }, 6000);
          }

          function pararDeVez() {
            parado = true;
            agendar();
          }

          banner.querySelector("[data-banner-ant]").addEventListener("click", function () {
            pararDeVez();
            irPara(atual - 1);
          });
          banner.querySelector("[data-banner-prox]").addEventListener("click", function () {
            pararDeVez();
            irPara(atual + 1);
          });
          Array.prototype.forEach.call(pontos, function (p, j) {
            p.addEventListener("click", function () {
              pararDeVez();
              irPara(j);
            });
          });
          trilho.addEventListener("pointerdown", pararDeVez, { passive: true });
          trilho.addEventListener("wheel", function (ev) {
            if (Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) pararDeVez();
          }, { passive: true });

          var marcarNoQuadro = null;
          trilho.addEventListener("scroll", function () {
            if (marcarNoQuadro) return;
            marcarNoQuadro = requestAnimationFrame(function () {
              marcarNoQuadro = null;
              marcar();
            });
          }, { passive: true });

          banner.addEventListener("mouseenter", function () {
            mouseEmCima = true;
            agendar();
          });
          banner.addEventListener("mouseleave", function () {
            mouseEmCima = false;
            agendar();
          });

          if ("IntersectionObserver" in window) {
            new IntersectionObserver(function (entradas) {
              visivel = entradas[0].isIntersecting;
              agendar();
            }).observe(banner);
          } else {
            visivel = true;
            agendar();
          }
        });

        /* ---- Ano do rodapé ----------------------------------------------- */
        var ano = document.getElementById("ano");
        if (ano) ano.textContent = new Date().getFullYear();

        /* ---- Formulário -----------------------------------------------------
           Envia via fetch() pro endpoint do próprio atributo `action` (hoje um
           webhook do n8n da Widen Creative) — o handler não sabe nem precisa
           saber qual serviço está do outro lado, só que ele aceita POST com
           FormData e responde OK/erro. Fica dentro de uma função aplicada a
           cada form[data-form-endpoint], em vez de assumir um único
           formulário fixo por id, caso mais algum apareça na página no
           futuro. */
        var mensagensErro = {
          valueMissing: "Este campo é obrigatório.",
          typeMismatch: "Informe um valor válido.",
          patternMismatch: "Formato inválido. Verifique o número informado.",
        };

        /* ---- Validação sem puxar o tapete do clique -------------------------
           A mensagem de erro de um campo aparece quando ele perde o foco. Se
           o foco saiu porque a pessoa tocou no checkbox dos termos (ou em
           qualquer controle abaixo), a mensagem entra no layout entre o
           mousedown e o mouseup e empurra o alvo ~22px pra baixo: o clique
           termina em outro elemento e o checkbox não marca. Foi reproduzido
           no desktop e no celular. Então a validação do blur/change espera o
           toque terminar: com o ponteiro pressionado, fica pro próximo
           pointerup (com teto de 600ms, caso o pointerup se perca num
           <select> nativo); sem ponteiro (Tab do teclado ou toque, cujos
           eventos de mouse chegam depois do pointerup), um setTimeout(0)
           basta pra sair de trás do click. */
        var ponteiroPressionado = false;
        document.addEventListener("pointerdown", function () { ponteiroPressionado = true; }, true);
        document.addEventListener("pointerup", function () { ponteiroPressionado = false; }, true);
        document.addEventListener("pointercancel", function () { ponteiroPressionado = false; }, true);
        window.addEventListener("blur", function () { ponteiroPressionado = false; });

        function depoisDoClique(fn) {
          if (!ponteiroPressionado) {
            setTimeout(fn, 0);
            return;
          }
          var teto = null;
          var concluir = function () {
            clearTimeout(teto);
            document.removeEventListener("pointerup", concluir, true);
            document.removeEventListener("pointercancel", concluir, true);
            setTimeout(fn, 0);
          };
          teto = setTimeout(concluir, 600);
          document.addEventListener("pointerup", concluir, true);
          document.addEventListener("pointercancel", concluir, true);
        }

        function ligarFormulario(form) {
          var status = form.querySelector("[data-form-status]");

          function validarCampo(campo) {
            var erro = campo.parentElement.querySelector(".field-error");
            if (!erro) return;
            if (campo.validity.valid) {
              erro.textContent = "";
              campo.removeAttribute("aria-invalid");
              return;
            }
            var chave = Object.keys(mensagensErro).filter(function (k) {
              return campo.validity[k];
            })[0];
            erro.textContent = chave ? mensagensErro[chave] : "Verifique este campo.";
            campo.setAttribute("aria-invalid", "true");
          }

          var campos = form.querySelectorAll("input, textarea, select");
          Array.prototype.forEach.call(campos, function (campo) {
            var validarDepois = function () {
              depoisDoClique(function () {
                validarCampo(campo);
              });
            };
            campo.addEventListener("blur", validarDepois);
            campo.addEventListener("change", validarDepois);
          });

          /* ---- Máscara do WhatsApp -----------------------------------------
             Formata enquanto digita: o DDD entra entre parênteses e o resto do
             número vem depois. Só os dígitos contam pro limite de 11 (2 do DDD
             + 9) — parênteses e espaço são enfeite, e é por isso que o
             maxlength do HTML é 14 e não 11. Sem JS o campo continua aceitando
             o número digitado à mão (o pattern aceita os dois formatos). */
          function formatarTelefone(valor) {
            var digitos = valor.replace(/\D/g, "").slice(0, 11);
            if (digitos.length <= 2) return digitos ? "(" + digitos : "";
            return "(" + digitos.slice(0, 2) + ") " + digitos.slice(2);
          }

          var campoTelefone = form.querySelector('input[type="tel"]');
          if (campoTelefone) {
            campoTelefone.addEventListener("input", function () {
              // Quantos dígitos havia antes do cursor: é essa contagem, e não a
              // posição em caracteres, que sobrevive à reformatação.
              var digitosAntesDoCursor = campoTelefone.value.slice(0, campoTelefone.selectionStart || 0).replace(/\D/g, "").length;
              campoTelefone.value = formatarTelefone(campoTelefone.value);

              var pos = 0;
              var vistos = 0;
              while (pos < campoTelefone.value.length && vistos < digitosAntesDoCursor) {
                if (/\d/.test(campoTelefone.value.charAt(pos))) vistos++;
                pos++;
              }
              // Pula a pontuação que vier logo depois (o ") " do DDD), senão o
              // próximo dígito digitado entraria antes dela.
              while (pos < campoTelefone.value.length && !/\d/.test(campoTelefone.value.charAt(pos))) pos++;
              try {
                campoTelefone.setSelectionRange(pos, pos);
              } catch (e) {
                /* input[type=tel] aceita seleção em todo navegador atual; se
                   algum recusar, a máscara ainda funciona com o cursor no fim. */
              }
            });
          }

          /* ---- Formulário em duas etapas -----------------------------------
             Etapa 1 (Sobre a operação) vem antes de Etapa 2 (Seus dados). O
             atributo `hidden` na etapa escondida tira os campos dela da
             validação do formulário (é assim que o navegador já trata
             campos não renderizados), então o "Solicitar análise de crédito"
             na etapa 2 nunca é bloqueado por um campo da etapa 1 que já foi
             validado ao avançar. */
          // Declarado fora do bloco abaixo (e atribuído por expressão, não por
          // function declaration) para continuar acessível dali pra baixo,
          // inclusive dentro do "use strict" — uma function declaration dentro
          // de um if tem escopo só do bloco em modo estrito.
          var mostrarPasso = null;

          if (form.hasAttribute("data-form-steps")) {
            var passo1 = form.querySelector('[data-form-step="1"]');
            var passo2 = form.querySelector('[data-form-step="2"]');
            var btnAvancar = form.querySelector("[data-form-next]");
            var btnVoltar = form.querySelector("[data-form-back]");

            // Qual etapa está ativa já é comunicado pela legenda de cada
            // fieldset ("Sobre a operação" / "Seus dados"), então não há um
            // indicador de progresso separado — um elemento a menos, cartão
            // mais compacto.
            mostrarPasso = function (numero) {
              var alvo = numero === 1 ? passo1 : passo2;
              var outro = numero === 1 ? passo2 : passo1;

              outro.hidden = true;
              outro.classList.remove("form-step--visivel");
              alvo.hidden = false;

              if (semMovimento) {
                alvo.classList.add("form-step--visivel");
              } else {
                // A etapa acabou de virar de `display: none` pra visível, com
                // opacidade 0 (ver .form-step no CSS). Dois `requestAnimationFrame`
                // garantem que o navegador já pintou esse estado inicial antes de
                // adicionar a classe que anima pra opacidade 1 — só um rAF às
                // vezes roda antes do layout, e a transição não anima nada.
                alvo.classList.remove("form-step--visivel");
                requestAnimationFrame(function () {
                  requestAnimationFrame(function () {
                    alvo.classList.add("form-step--visivel");
                  });
                });
              }

              var primeiroCampo = alvo.querySelector("input, select, textarea");
              if (primeiroCampo) primeiroCampo.focus();
            };

            if (btnAvancar) {
              btnAvancar.addEventListener("click", function () {
                var camposPasso1 = passo1.querySelectorAll("input, select, textarea");
                Array.prototype.forEach.call(camposPasso1, validarCampo);
                var primeiroInvalido = passo1.querySelector("input:invalid, textarea:invalid, select:invalid");
                if (primeiroInvalido) {
                  primeiroInvalido.focus();
                  return;
                }
                mostrarPasso(2);
              });
            }

            if (btnVoltar) {
              btnVoltar.addEventListener("click", function () {
                mostrarPasso(1);
              });
            }
          }

          function mostrarStatus(texto, tipo) {
            if (!status) return;
            status.textContent = texto;
            status.className = "form-status form-status--" + tipo;
            status.hidden = false;
          }

          form.addEventListener("submit", function (ev) {
            ev.preventDefault();

            // Num formulário em etapas, só a etapa visível (etapa 2) é
            // validada aqui — a etapa 1 já foi validada ao avançar. Isso é
            // necessário porque `hidden` num ancestral NÃO tira um campo da
            // validação nativa (só `disabled` faz isso, e `disabled` também
            // tiraria o campo do envio, o que não queremos: os dados da
            // etapa 1 têm que continuar indo no FormData). Sem essa
            // distinção, form.checkValidity() podia travar no envio final
            // tentando focar um campo escondido que o usuário nem vê.
            var camposParaValidar = mostrarPasso ? passo2.querySelectorAll("input, select, textarea") : campos;
            var primeiroInvalido = null;
            Array.prototype.forEach.call(camposParaValidar, function (campo) {
              validarCampo(campo);
              if (!primeiroInvalido && !campo.validity.valid) primeiroInvalido = campo;
            });

            if (primeiroInvalido) {
              primeiroInvalido.focus();
              return;
            }

            /* Sem endpoint configurado ainda (action com [INSERIR...]): monta
               uma mensagem com as respostas e abre o WhatsApp da corretora.
               Quando houver um webhook real em `action`, o fetch abaixo
               assume sozinho. */
            if (form.getAttribute("action").indexOf("[") !== -1) {
              var dados = new FormData(form);
              var linhas = ["Olá, Gilmara Tusthler! Vim pelo site do Residencial Monte Moriá."];
              [["interesse", "Interesse"], ["finalidade", "Finalidade"], ["visita", "Visita"], ["nome", "Nome"], ["telefone", "WhatsApp"], ["email", "E-mail"]].forEach(function (par) {
                var v = dados.get(par[0]);
                if (v) linhas.push(par[1] + ": " + v);
              });
              rastrear("Lead");
              window.open("https://wa.me/" + (form.dataset.whatsapp || "5527999784895") + "?text=" + encodeURIComponent(linhas.join("\n")), "_blank", "noopener");
              mostrarStatus("Abrimos o WhatsApp com a sua mensagem pronta. É só enviar.", "ok");
              return;
            }

            mostrarStatus("Enviando solicitação...", "info");
            var enviar = form.querySelector('button[type="submit"]');
            if (enviar) enviar.disabled = true;
            var redirecionando = false;

            fetch(form.action, {
              method: "POST",
              body: new FormData(form),
              headers: { Accept: "application/json" },
            })
              .then(function (r) {
                if (!r.ok) throw new Error("falha");
                form.reset();
                // form.reset() só reverte o valor dos campos — a etapa visível
                // (controlada por `hidden` em divs, não em controles de
                // formulário) não muda por conta própria. Volta pra etapa 1
                // pra deixar tudo pronto caso a pessoa volte pra cá pelo
                // botão "voltar" do navegador.
                if (mostrarPasso) mostrarPasso(1);
                // A confirmação agora é a página de obrigado, não a mensagem
                // embaixo do formulário. O status de "redirecionando" cobre o
                // intervalo até a nova página pintar, e `assign` (em vez de
                // `replace`) mantém o site no histórico, pra o "voltar"
                // funcionar como a pessoa espera.
                redirecionando = true;
                rastrear("Lead");
                mostrarStatus("Solicitação enviada. Redirecionando...", "ok");
                window.location.assign("obrigado.html");
              })
              .catch(function () {
                mostrarStatus(
                  "Não foi possível enviar sua solicitação agora. Tente novamente ou fale conosco pelo WhatsApp.",
                  "erro"
                );
              })
              .then(function () {
                // Enquanto a navegação acontece o botão fica desabilitado de
                // propósito: reabilitar aqui abriria uma janela de alguns
                // instantes em que dá pra enviar o formulário de novo.
                if (enviar && !redirecionando) enviar.disabled = false;
              });
          });
        }

        Array.prototype.forEach.call(document.querySelectorAll("form[data-form-endpoint]"), ligarFormulario);
      })();
