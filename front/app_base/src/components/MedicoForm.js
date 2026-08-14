import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  Platform} from 'react-native';

import { Picker } from '@react-native-picker/picker';


// Lista de Especialidades para o Picker
const especialidades = ['Cardiologia', 'Pediatria', 'Dermatologia', 'Ginecologia', 'Neurologia', 'Oftalmologia', 'Clínica Geral'];

// Estado inicial vazio para um novo médico
const initialMedicoState = {
  nome: '',
  especialidade: especialidades[0], // Padrão
  crm: '',
  email: '',
  telefone: '',
  logradouro: '',
  numero: '',
  complemento: '',
  cidade: '',
  uf: '',
  cep: '',
};

/**
 * Componente MedicoForm para Cadastro ou Edição.
 * @param {object} props.medico - Objeto do médico para edição, ou null para cadastro.
 * @param {function} props.onSave - Função chamada ao concluir com sucesso.
 * @param {function} props.onCancel - Função chamada ao cancelar.
 * @param {object} props.navigation - Objeto de navegação.
 */
const MedicoForm = ({ medico, onSave, onCancel, navigation }) => {
  // 1. Inicializa o estado com base na prop 'medico'
  const [formData, setFormData] = useState(medico || initialMedicoState);
  
  // 2. Estado para rastrear erros de validação
  const [errors, setErrors] = useState({});

  // 3. Define o título do botão e o modo do formulário
  const isEditing = !!medico;
  const buttonTitle = isEditing ? 'Concluir Edição' : 'Concluir Cadastro';

  // Campos obrigatórios
  const requiredFields = [
    'nome', 'especialidade', 'crm', 'email', 'telefone', 
    'logradouro', 'numero', 'cidade', 'uf', 'cep'
  ];

  // Atualiza o formData quando o prop 'medico' muda (útil se o componente for reutilizado)
  useEffect(() => {
    setFormData(medico || initialMedicoState);
  }, [medico]);

  // Função genérica para atualizar o estado do formulário
  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    // Remove o erro assim que o usuário começa a digitar
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Função de Validação
  const validate = () => {
    let valid = true;
    const newErrors = {};

    requiredFields.forEach(field => {
      // Verifica se o campo está vazio ou é apenas espaço em branco
      if (!formData[field] || String(formData[field]).trim() === '') {
        newErrors[field] = 'Campo Obrigatório';
        valid = false;
      }
    });

    setErrors(newErrors);
    return valid;
  };

  // Função de submissão do formulário
  const handleSubmit = () => {
    if (validate()) {
      // Supondo que a função onSave lida com a lógica de API/Estado
      onSave(formData); 
      Alert.alert(
        isEditing ? 'Sucesso' : 'Cadastro Concluído', 
        isEditing ? 'Dados do médico atualizados.' : 'Novo médico cadastrado com sucesso!'
      );
      navigation.goBack();
    } else {
      Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios.');
    }
  };
  
  // =========================================================================
  // SUB-COMPONENTE: INPUT COM VALIDAÇÃO
  // =========================================================================
  const ValidatedInput = ({ label, name, ...props }) => (
    <View style={formStyles.inputGroup}>
      <Text style={formStyles.label}>{label}</Text>
      <TextInput
        style={[formStyles.input, errors[name] && formStyles.inputError]}
        value={formData[name]}
        onChangeText={(text) => handleChange(name, text)}
        {...props}
      />
      {errors[name] && <Text style={formStyles.errorText}>{errors[name]}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <Text style={styles.title}>{isEditing ? 'Editar Perfil' : 'Novo Cadastro'}</Text>

        {/* ====================================
            1. PROFISSIONAL
            ==================================== */}
        <Text style={styles.sectionHeader}>1. Profissional</Text>
        <ValidatedInput 
          label="Nome Completo" 
          name="nome" 
          placeholder="Ex: Ana Maria da Silva" 
        />
        
        {/* Campo Especialidade (Lista de Seleção) */}
        <View style={formStyles.inputGroup}>
          <Text style={formStyles.label}>Especialidade</Text>
          <View style={[formStyles.pickerWrapper, errors.especialidade && formStyles.inputError]}>
            <Picker
              selectedValue={formData.especialidade}
              onValueChange={(itemValue) => handleChange('especialidade', itemValue)}
              style={formStyles.picker}
            >
              {especialidades.map(esp => (
                <Picker.Item key={esp} label={esp} value={esp} />
              ))}
            </Picker>
          </View>
          {errors.especialidade && <Text style={formStyles.errorText}>{errors.especialidade}</Text>}
        </View>

        <ValidatedInput 
          label="CRM" 
          name="crm" 
          placeholder="Ex: 12345/MG" 
        />

        {/* ====================================
            2. CONTATOS
            ==================================== */}
        <Text style={styles.sectionHeader}>2. Contatos</Text>
        <ValidatedInput 
          label="Email" 
          name="email" 
          placeholder="email@exemplo.com" 
          keyboardType="email-address"
        />
        <ValidatedInput 
          label="Telefone Celular" 
          name="telefone" 
          placeholder="(XX) XXXXX-XXXX" 
          keyboardType="phone-pad"
        />

        {/* ====================================
            3. ENDEREÇO PROFISSIONAL
            ==================================== */}
        <Text style={styles.sectionHeader}>3. Endereço Profissional</Text>
        <ValidatedInput 
          label="Logradouro" 
          name="logradouro" 
          placeholder="Ex: Rua das Flores" 
        />
        <View style={formStyles.row}>
          <ValidatedInput 
            label="Número" 
            name="numero" 
            placeholder="Nº" 
            keyboardType="numeric"
            style={formStyles.inputHalf}
          />
          <ValidatedInput 
            label="Complemento" 
            name="complemento" 
            placeholder="Apto/Sala (Opcional)"
            style={formStyles.inputHalf}
            // Não é obrigatório (retirei do array requiredFields se fosse o caso)
          />
        </View>
        <ValidatedInput 
          label="Cidade" 
          name="cidade" 
          placeholder="Ex: Belo Horizonte" 
        />
        <View style={formStyles.row}>
          <ValidatedInput 
            label="UF" 
            name="uf" 
            placeholder="Ex: MG" 
            maxLength={2}
            style={formStyles.inputQuarter}
          />
          <ValidatedInput 
            label="CEP" 
            name="cep" 
            placeholder="XXXXX-XXX" 
            keyboardType="numeric"
            maxLength={9}
            style={formStyles.inputThreeQuarter}
          />
        </View>
      </ScrollView>

      {/* BOTÕES FIXOS NA PARTE INFERIOR */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[formStyles.button, formStyles.saveButton]}
          onPress={handleSubmit}
        >
          <Text style={formStyles.buttonText}>{buttonTitle}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[formStyles.button, formStyles.cancelButton]}
          onPress={onCancel || (() => navigation.goBack())}
        >
          <Text style={formStyles.buttonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// =========================================================================
// ESTILOS DO FORMULÁRIO
// =========================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Espaço para os botões fixos
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#007AFF', // Cor de destaque
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

const formStyles = StyleSheet.create({
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
    fontWeight: '500',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    height: 45,
  },
  inputError: {
    borderColor: 'red',
    borderWidth: 2,
    backgroundColor: '#ffe8e8',
  },
  errorText: {
    fontSize: 12,
    color: 'red',
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10, // Espaçamento entre os campos na linha
  },
  inputHalf: {
    flex: 1, // Ocupa metade do espaço
  },
  inputQuarter: {
    flex: 0.3, // Ocupa cerca de 30%
  },
  inputThreeQuarter: {
    flex: 0.7, // Ocupa o restante
  },
  // Estilo específico para o Picker
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    height: 45,
    overflow: 'hidden', // Importante para o Android
  },
  picker: {
    // Para iOS, o Picker não precisa de height/width se o wrapper tiver
    // Para Android, pode ser necessário ajustar se houver padding estranho
    height: Platform.OS === 'ios' ? undefined : 45,
    width: '100%',
  },
  // Estilos dos Botões de Ação
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  saveButton: {
    backgroundColor: '#007AFF', // Azul primário
  },
  cancelButton: {
    backgroundColor: '#6c757d', // Cinza
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MedicoForm;