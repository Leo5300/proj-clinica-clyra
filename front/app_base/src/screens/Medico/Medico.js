// src/screens/Medico/Op1Screen.js (Reescrito)
import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  SectionList, 
  TouchableOpacity, 
  Platform,
  LayoutAnimation,
  UIManager,
  Button,
  Image
} from 'react-native';

// Ícones (você precisará ter esses arquivos PNG ou usar uma biblioteca de ícones)
// Assumindo que você tem um ícone de lupa e um triângulo/seta
const IconeLupa = require('../../../assets/lupa.png'); // Exemplo
const IconeSeta = require('../../../assets/seta.png'); // Exemplo

// Habilita LayoutAnimation para Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// =========================================================================
// FUNÇÃO AUXILIAR PARA AGRUPAR E FILTRAR OS DADOS
// =========================================================================
const groupAndFilterMedicos = (medicos, searchText) => {
  const filteredMedicos = medicos.filter(medico => 
    medico.nome.toLowerCase().includes(searchText.toLowerCase()) || 
    medico.especialidade.toLowerCase().includes(searchText.toLowerCase())
  );

  const grouped = filteredMedicos.reduce((acc, medico) => {
    const firstLetter = medico.nome[0].toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(medico);
    return acc;
  }, {});

  // Converte o objeto agrupado para o formato do SectionList
  const sections = Object.keys(grouped)
    .sort() // Garante a ordem alfabética das seções
    .map(letter => ({
      title: letter,
      data: grouped[letter],
    }));

  return sections;
};

// =========================================================================
// COMPONENTE CARD EXPANSÍVEL
// =========================================================================
const MedicoCard = ({ medico, navigation }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    // Anima a mudança de layout
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  return (
    <View style={cardStyles.card}>
      {/* SEÇÃO PRINCIPAL VISÍVEL */}
      <TouchableOpacity onPress={toggleExpand} style={cardStyles.mainInfo}>
        <View>
          <Text style={cardStyles.nome}>{medico.nome}</Text>
          <Text style={cardStyles.especialidade}>{medico.especialidade} | CRM: {medico.crm}</Text>
        </View>
        
        {/* Ícone triangular para expandir/colapsar */}
        <Image
          source={IconeSeta}
          style={[
            cardStyles.arrowIcon,
            { transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] },
          ]}
        />
      </TouchableOpacity>

      {/* SEÇÃO EXPANSÍVEL (Detalhes) */}
      {isExpanded && (
        <View style={cardStyles.details}>
          <Text style={cardStyles.detailText}>Email: {medico.email}</Text>
          <Text style={cardStyles.detailText}>Telefone: {medico.telefone}</Text>
          <Text style={cardStyles.detailText}>Endereço: {medico.endereco}</Text>
          
          <View style={cardStyles.actionButtons}>
            <Button
              title="Editar"
              onPress={() => navigation.navigate('MedicoForm', medico)} // Deveria ser uma tela de edição
            />
            <Button
              title="Desativar Perfil"
              color="red"
              onPress={() => navigation.navigate('EmConstrucao')} 
            />
          </View>
        </View>
      )}
    </View>
  );
};

// =========================================================================
// TELA PRINCIPAL
// =========================================================================
const Medico = ({ navigation, medicos }) => {
  const [searchText, setSearchText] = useState('');

  // Use useMemo para recalcular as seções apenas quando 'medicos' ou 'searchText' mudar
  const sections = useMemo(() => groupAndFilterMedicos(medicos, searchText), [medicos, searchText]);

  return (
    <View style={styles.container}>
      
      {/* CAMPO PESQUISAR (Não rolável) */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar Médico ou Especialidade"
          value={searchText}
          onChangeText={setSearchText}
        />
        <Image source={IconeLupa} style={styles.searchIcon} />
      </View>

      {/* LISTA ROLÁVEL (Ocupa 80% da tela) */}
      <View style={styles.listWrapper}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <MedicoCard medico={item} navigation={navigation} />}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
          // Estilo para o SectionList
          contentContainerStyle={styles.sectionListContent}
          stickySectionHeadersEnabled={true} // Mantém as letras fixas no topo
        />
      </View>

      {/* BOTÃO FIXO (Não rolável) */}
      <View style={styles.fixedButtonContainer}>
        <Button
          title="Cadastrar Novo Perfil"
          onPress={() => navigation.navigate('MedicoForm')} // Exemplo
        />
      </View>
    </View>
  );
};

// =========================================================================
// ESTILOS
// =========================================================================
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5', 
    padding: 10 
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
  },
  searchIcon: {
    width: 20,
    height: 20,
    marginLeft: 10,
    tintColor: '#aaa',
  },
  listWrapper: {
    // Ocupa o restante do espaço após o campo de pesquisa, 
    // mas antes do botão fixo. Usamos flex: 1 para o SectionList.
    flex: 1, 
  },
  sectionListContent: {
    paddingBottom: 10, // Espaçamento extra no final da lista
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    backgroundColor: '#f5f5f5',
    paddingVertical: 5,
    paddingHorizontal: 10,
    color: '#333',
  },
  fixedButtonContainer: {
    // Este container é fixo na parte inferior
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    marginBottom: 25,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 5,
    marginHorizontal: 10,
    overflow: 'hidden', // Importante para o LayoutAnimation
    borderWidth: 1,
    borderColor: '#eee',
  },
  mainInfo: {
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nome: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  especialidade: {
    fontSize: 14,
    color: '#555',
  },
  arrowIcon: {
    width: 15,
    height: 15,
    tintColor: '#007AFF',
  },
  details: {
    padding: 15,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  detailText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  }
});

export default Medico;