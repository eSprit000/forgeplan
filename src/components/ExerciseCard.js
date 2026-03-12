import { Text, View } from 'react-native';

const ExerciseCard = ({ exercise }) => (
  <View>
    <Text>{exercise.name}</Text>
  </View>
);

export default ExerciseCard;
