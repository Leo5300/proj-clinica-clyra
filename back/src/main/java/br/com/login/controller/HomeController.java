package br.com.login.controller;

// TODO: ajustar para o pacote base real do projeto (ex.: com.clyra.backend.home)

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Endpoint da tela de Início do app do paciente.
 *
 * Padrão adotado: um endpoint por tela, retornando já tudo que aquela tela
 * precisa (saudação, próxima sessão, lembretes) numa única chamada,
 * em vez do front ter que combinar várias requisições diferentes.
 *
 * TODO: trocar os dados mockados por chamadas reais assim que existirem
 *       PacienteService / SessaoService / LembreteService no projeto.
 */
@RestController
@RequestMapping("/api/home")
public class HomeController {

    @GetMapping("/{pacienteId}")
    public ResponseEntity<HomeResponse> getHome(@PathVariable Long pacienteId) {

        // TODO: buscar paciente real pelo id (PacienteRepository)
        String nomePaciente = "Maria Fernandes";

        // TODO: buscar a próxima sessão/consulta real do paciente
        // (SessaoRepository, ordenando por data/hora, status = CONFIRMADA)
        LocalDateTime dataSessao = LocalDateTime.now().plusDays(2).withHour(14).withMinute(30);

        NextAppointmentDTO proximaConsulta = new NextAppointmentDTO(
                "Dra. Camila Rocha",
                "Psicologia Clínica",
                "Sala 3",
                formatarDataHora(dataSessao),
                relativoEmDias(dataSessao),
                "0842"
        );

        // TODO: buscar lembretes reais (ex.: notificações não lidas do paciente)
        List<ReminderDTO> lembretes = List.of(
                new ReminderDTO(
                        1L,
                        "Lembrete enviado às 08:00 — sua sessão é amanhã. Confirmação também enviada por SMS."
                )
        );

        HomeResponse response = new HomeResponse(
                saudacaoPorHorario(),
                nomePaciente,
                proximaConsulta,
                lembretes
        );

        return ResponseEntity.ok(response);
    }

    private String saudacaoPorHorario() {
        int hora = LocalDateTime.now().getHour();
        if (hora < 12) return "Bom dia";
        if (hora < 18) return "Boa tarde";
        return "Boa noite";
    }

    private String formatarDataHora(LocalDateTime data) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("EEEE, HH'h'mm");
        String formatado = data.format(formatter);
        return formatado.substring(0, 1).toUpperCase() + formatado.substring(1);
    }

    private String relativoEmDias(LocalDateTime data) {
        long dias = ChronoUnit.DAYS.between(LocalDateTime.now().toLocalDate(), data.toLocalDate());
        if (dias <= 0) return "hoje";
        if (dias == 1) return "amanhã";
        return "daqui a " + dias + " dias";
    }

    // ===== DTOs da tela =====
    // Mantidos no mesmo arquivo por enquanto, seguindo o padrão de
    // "um arquivo por tela". Os nomes dos campos (proximaConsulta, medico,
    // especialidade...) precisam continuar batendo com o que o HomeScreen.js
    // espera receber — se mudar um lado, muda o outro.

    public record HomeResponse(
            String saudacao,
            String nomePaciente,
            NextAppointmentDTO proximaConsulta,
            List<ReminderDTO> lembretes
    ) {}

    public record NextAppointmentDTO(
            String medico,
            String especialidade,
            String local,
            String dataHoraFormatada,
            String relativo,
            String protocolo
    ) {}

    public record ReminderDTO(Long id, String mensagem) {}
}