package br.com.login;

// TODO: ajustar para o pacote base real do projeto

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Sem isso, o navegador/app bloqueia as chamadas do Expo (rodando em uma
 * porta diferente) para o backend — erro de CORS no console, não erro de rede.
 *
 * TODO: quando for pra produção, trocar "*" pela URL real do app publicado
 * (ou remover essa liberação ampla e usar variável de ambiente por perfil).
 */
@Configuration
public class Corsconfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                .allowedHeaders("*");
    }
}