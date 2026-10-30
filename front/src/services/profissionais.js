// src/services/profissionais.js
//
// Como o app escreve o registro e a area de quem atende. A API devolve
// area e conselho calculados pela especialidade; o numero fica sempre no
// campo crm (nome historico do campo, vale para CRP tambem).

// "CRP 04/12345" ou "CRM 45678/RJ". Sem conselho conhecido, so o numero.
export function registroDoProfissional(profissional) {
  if (!profissional?.crm) return null;
  return profissional.conselho
    ? `${profissional.conselho} ${profissional.crm}`
    : profissional.crm;
}

// "Psicologia clínica · CRP 04/12345"
export function especialidadeERegistro(profissional) {
  return [profissional?.especialidade, registroDoProfissional(profissional)]
    .filter(Boolean)
    .join(' · ');
}
