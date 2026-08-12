package br.com.login.controller;

// TODO: ajustar para o pacote base real do projeto

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Endpoint da tela de Login.
 *
 * TODO: substituir a validação mockada por Spring Security de verdade
 *       (UserDetailsService + BCryptPasswordEncoder + geração de JWT).
 *
 * O login por biometria não reenvia e-mail/senha: ele troca um
 * "deviceToken" (salvo no app com expo-secure-store no primeiro login)
 * por uma sessão nova. Isso evita guardar a senha no celular.
 */
@RestController
@RequestMapping("/api/auth")
public class LoginController {

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        // TODO: buscar o paciente pelo e-mail (PacienteRepository) e comparar
        // a senha com passwordEncoder.matches(request.senha(), paciente.getSenhaHash())
        boolean credenciaisValidas = request.email() != null
                && request.senha() != null
                && !request.senha().isBlank();

        if (!credenciaisValidas) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        AuthResponse response = new AuthResponse(
                "token-mockado-trocar-por-jwt-real",
                "token-dispositivo-biometria-mockado",
                1L,
                "Maria Fernandes",
                "PACIENTE"
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login/biometria")
    public ResponseEntity<AuthResponse> loginBiometria(@RequestBody BiometricLoginRequest request) {
        // TODO: validar o deviceToken contra o que foi persistido no primeiro
        // login (tabela dispositivos_confiaveis, por exemplo)
        boolean tokenValido = request.deviceToken() != null && !request.deviceToken().isBlank();

        if (!tokenValido) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        AuthResponse response = new AuthResponse(
                "token-mockado-trocar-por-jwt-real",
                request.deviceToken(),
                request.pacienteId(),
                "Maria Fernandes",
                "PACIENTE"
        );
        return ResponseEntity.ok(response);
    }

    public record LoginRequest(String email, String senha) {}

    public record BiometricLoginRequest(Long pacienteId, String deviceToken) {}

    public record AuthResponse(
            String token,
            String deviceToken,
            Long pacienteId,
            String nome,
            String tipoUsuario
    ) {}
}